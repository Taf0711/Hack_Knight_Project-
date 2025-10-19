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
                passages.append({
                    "id": row[0],
                    "document_id": row[1],
                    "page": row[2],
                    "text": row[3],
                    "char_start": row[4],
                    "char_end": row[5],
                    "similarity": similarity
                })
        
        self.logger.info(
            f"Found {len(passages)} similar passages",
            avg_similarity=sum(p['similarity'] for p in passages) / len(passages) if passages else 0
        )
        return passages
    
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
        
        # Get more passages initially (will re-rank)
        semantic_results = self.similarity_search(
            session=session,
            query_embedding=query_embedding,
            document_id=document_id,
            top_k=min(15, top_k * 2),  # Get 2x results for re-ranking
            similarity_threshold=0.60  # Even lower threshold for first pass
        )
        
        # Re-rank with hybrid scoring
        for passage in semantic_results:
            # Calculate keyword overlap score
            keyword_score = calculate_keyword_overlap(passage['text'], keywords)
            
            # Hybrid score: 70% semantic + 30% keyword
            passage['keyword_score'] = keyword_score
            passage['hybrid_score'] = (
                passage['similarity'] * 0.7 + 
                keyword_score * 0.3
            )
        
        # Sort by hybrid score and return top_k
        ranked_passages = sorted(
            semantic_results,
            key=lambda x: x['hybrid_score'],
            reverse=True
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

