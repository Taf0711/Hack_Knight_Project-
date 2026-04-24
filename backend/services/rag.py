from typing import List, Dict, Optional
from uuid import UUID
from sqlmodel import Session, select, text
import structlog
from models.database import Passage, Document
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.grounding import extract_keywords, calculate_keyword_overlap

logger = structlog.get_logger()


class RAGService:
    """Retrieval-Augmented Generation service using pgvector with hybrid search"""
    
    def __init__(self):
        self.logger = logger.bind(service="rag")

    def _normalize_passage_row(self, row) -> Dict:
        return {
            "id": row[0],
            "document_id": row[1],
            "page": row[2],
            "text": row[3],
            "char_start": row[4],
            "char_end": row[5],
        }
    
    def similarity_search(
        self,
        session: Session,
        query_embedding: List[float],
        document_id: Optional[UUID] = None,
        top_k: int = 8,  # Increased from 5 to 8 for better recall
        similarity_threshold: float = 0.65  # Lowered from 0.7 to 0.65 for better recall
    ) -> List[Dict]:
        """
        Search for similar passages using cosine similarity
        Returns list of passages with similarity scores
        """
        # Build query with pgvector
        embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
        
        if document_id:
            query = text(f"""
                SELECT 
                    id,
                    document_id,
                    page,
                    text,
                    char_start,
                    char_end,
                    1 - (embedding <=> :embedding) as similarity
                FROM passage
                WHERE document_id = :document_id
                    AND embedding IS NOT NULL
                ORDER BY embedding <=> :embedding
                LIMIT :top_k
            """)
            
            result = session.exec(
                query.bindparams(
                    embedding=embedding_str,
                    document_id=str(document_id),
                    top_k=top_k
                )
            ).all()
        else:
            query = text(f"""
                SELECT 
                    id,
                    document_id,
                    page,
                    text,
                    char_start,
                    char_end,
                    1 - (embedding <=> :embedding) as similarity
                FROM passage
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> :embedding
                LIMIT :top_k
            """)
            
            result = session.exec(
                query.bindparams(
                    embedding=embedding_str,
                    top_k=top_k
                )
            ).all()
        
        # Convert to list of dicts
        passages = []
        for row in result:
            similarity = row[-1]  # Last column is similarity
            
            if similarity >= similarity_threshold:
                passage = self._normalize_passage_row(row)
                passage["similarity"] = similarity
                passages.append(passage)
        
        self.logger.info(
            f"Found {len(passages)} similar passages",
            avg_similarity=sum(p['similarity'] for p in passages) / len(passages) if passages else 0
        )
        return passages

    def lexical_search(
        self,
        session: Session,
        query_text: str,
        document_id: Optional[UUID] = None,
        top_k: int = 8
    ) -> List[Dict]:
        """
        Keyword-oriented retrieval for exact values, years, and names that embeddings
        often miss. This is intentionally recall-oriented and is fused with semantic search.
        """
        keywords = extract_keywords(query_text)
        if not keywords:
            return []

        statement = select(Passage)
        if document_id:
            statement = statement.where(Passage.document_id == document_id)

        all_passages = session.exec(statement).all()
        ranked = []

        normalized_query = query_text.lower()
        numeric_keywords = [
            kw for kw in keywords
            if any(ch.isdigit() for ch in kw)
        ]
        for passage in all_passages:
            passage_text = (passage.text or "").lower()
            if not passage_text:
                continue

            keyword_score = calculate_keyword_overlap(passage_text, keywords)
            exact_phrase_bonus = 0.2 if normalized_query in passage_text else 0.0
            numeric_matches = sum(1 for kw in numeric_keywords if kw in passage_text)
            numeric_bonus = min(0.25 * numeric_matches, 0.75)
            numeric_penalty = 0.0
            if numeric_keywords and numeric_matches == 0:
                continue
            if numeric_keywords and numeric_matches < len(numeric_keywords):
                numeric_penalty = 0.05 * (len(numeric_keywords) - numeric_matches)

            score = keyword_score + exact_phrase_bonus + numeric_bonus - numeric_penalty
            if score <= 0:
                continue

            ranked.append({
                "id": passage.id,
                "document_id": passage.document_id,
                "page": passage.page,
                "text": passage.text,
                "char_start": passage.char_start,
                "char_end": passage.char_end,
                "keyword_score": score,
            })

        ranked.sort(key=lambda x: x["keyword_score"], reverse=True)
        return ranked[:top_k]

    def _expand_neighbor_passages(
        self,
        session: Session,
        base_passages: List[Dict],
        document_id: Optional[UUID]
    ) -> List[Dict]:
        """
        Add adjacent chunks on the same page to recover context split across chunk
        boundaries.
        """
        if not base_passages or not document_id:
            return base_passages

        pages = sorted({p.get("page") for p in base_passages if p.get("page") is not None})
        if not pages:
            return base_passages

        page_passages = session.exec(
            select(Passage).where(
                Passage.document_id == document_id,
                Passage.page.in_(pages)
            )
        ).all()

        passages_by_page: Dict[int, List[Passage]] = {}
        for passage in page_passages:
            passages_by_page.setdefault(passage.page, []).append(passage)

        for page, passages in passages_by_page.items():
            passages.sort(key=lambda p: ((p.char_start or 0), str(p.id)))

        merged = {str(p["id"]): p for p in base_passages}
        for selected in base_passages[:5]:
            page = selected.get("page")
            if page is None or page not in passages_by_page:
                continue

            ordered = passages_by_page[page]
            for idx, passage in enumerate(ordered):
                if str(passage.id) != str(selected["id"]):
                    continue

                for neighbor_idx in (idx - 1, idx + 1):
                    if 0 <= neighbor_idx < len(ordered):
                        neighbor = ordered[neighbor_idx]
                        merged.setdefault(str(neighbor.id), {
                            "id": neighbor.id,
                            "document_id": neighbor.document_id,
                            "page": neighbor.page,
                            "text": neighbor.text,
                            "char_start": neighbor.char_start,
                            "char_end": neighbor.char_end,
                            "similarity": selected.get("similarity", 0.0),
                            "keyword_score": selected.get("keyword_score", 0.0),
                            "fusion_score": max(selected.get("fusion_score", 0.0) - 0.01, 0.0),
                            "hybrid_score": max(selected.get("hybrid_score", 0.0) - 0.01, 0.0),
                        })
                break

        expanded = list(merged.values())
        expanded.sort(key=lambda x: x.get("hybrid_score", x.get("fusion_score", 0.0)), reverse=True)
        return expanded
    
    def hybrid_search(
        self,
        session: Session,
        query_embedding: List[float],
        query_text: str,
        document_id: Optional[UUID] = None,
        top_k: int = 8
    ) -> List[Dict]:
        """
        Hybrid search combining semantic similarity and keyword matching
        
        Args:
            session: Database session
            query_embedding: Query embedding vector
            query_text: Original query text for keyword extraction
            document_id: Optional document ID filter
            top_k: Number of results to return
        
        Returns:
            List of passages ranked by hybrid score
        """
        # Extract keywords from query
        keywords = extract_keywords(query_text)

        # Get more passages initially (will be fused and re-ranked)
        semantic_results = self.similarity_search(
            session=session,
            query_embedding=query_embedding,
            document_id=document_id,
            top_k=min(15, top_k * 2),  # Get 2x results for re-ranking
            similarity_threshold=0.60  # Even lower threshold for first pass
        )
        lexical_results = self.lexical_search(
            session=session,
            query_text=query_text,
            document_id=document_id,
            top_k=min(15, top_k * 2)
        )

        # Reciprocal-rank fusion so lexical retrieval can rescue misses from the
        # semantic shortlist.
        fused: Dict[str, Dict] = {}

        def add_ranked(passages: List[Dict], key_name: str):
            for rank, passage in enumerate(passages, start=1):
                passage_id = str(passage["id"])
                entry = fused.setdefault(passage_id, {
                    **passage,
                    "similarity": 0.0,
                    "keyword_score": 0.0,
                    "fusion_score": 0.0,
                })
                entry[key_name] = passage.get(key_name, entry.get(key_name, 0.0))
                entry["fusion_score"] += 1.0 / (60 + rank)

        add_ranked(semantic_results, "similarity")
        add_ranked(lexical_results, "keyword_score")

        for entry in fused.values():
            if keywords:
                entry["keyword_score"] = max(
                    entry.get("keyword_score", 0.0),
                    calculate_keyword_overlap(entry["text"], keywords)
                )
            entry["hybrid_score"] = (
                entry.get("fusion_score", 0.0) +
                entry.get("similarity", 0.0) * 0.35 +
                entry.get("keyword_score", 0.0) * 0.25
            )

        ranked_passages = sorted(
            fused.values(),
            key=lambda x: x["hybrid_score"],
            reverse=True
        )
        ranked_passages = self._expand_neighbor_passages(
            session=session,
            base_passages=ranked_passages,
            document_id=document_id
        )[:top_k]
        
        self.logger.info(
            f"Hybrid search found {len(ranked_passages)} passages",
            num_keywords=len(keywords),
            avg_hybrid_score=sum(p['hybrid_score'] for p in ranked_passages) / len(ranked_passages) if ranked_passages else 0
        )
        
        return ranked_passages
    
    def get_context_for_claim(
        self,
        session: Session,
        claim_text: str,
        query_embedding: List[float],
        document_id: UUID,
        max_tokens: int = 3000
    ) -> str:
        """
        Retrieve relevant context passages for a claim using hybrid search
        Returns concatenated context string
        """
        # Use hybrid search for better retrieval
        passages = self.hybrid_search(
            session=session,
            query_embedding=query_embedding,
            query_text=claim_text,
            document_id=document_id,
            top_k=10
        )
        
        # Build context string within token limit
        context_parts = []
        total_length = 0
        
        for passage in passages:
            text = passage["text"]
            page = passage["page"]
            
            # Rough token estimate (1 token ≈ 4 chars)
            estimated_tokens = len(text) // 4
            
            if total_length + estimated_tokens > max_tokens:
                break
            
            context_parts.append(f"[Page {page}]\n{text}")
            total_length += estimated_tokens
        
        context = "\n\n---\n\n".join(context_parts)
        self.logger.info(f"Built context with {len(context_parts)} passages")
        
        return context
    
    def get_passages_by_document(
        self,
        session: Session,
        document_id: UUID
    ) -> List[Passage]:
        """Get all passages for a document"""
        statement = select(Passage).where(Passage.document_id == document_id)
        passages = session.exec(statement).all()
        return list(passages)
