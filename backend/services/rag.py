from typing import List, Dict, Optional
from uuid import UUID
from sqlmodel import Session, select, text
import structlog
from models.database import Passage, Document

logger = structlog.get_logger()


class RAGService:
    """Retrieval-Augmented Generation service using pgvector"""
    
    def __init__(self):
        self.logger = logger.bind(service="rag")
    
    def similarity_search(
        self,
        session: Session,
        query_embedding: List[float],
        document_id: Optional[UUID] = None,
        top_k: int = 5,
        similarity_threshold: float = 0.7
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
        
        self.logger.info(f"Found {len(passages)} similar passages")
        return passages
    
    def get_context_for_claim(
        self,
        session: Session,
        claim_text: str,
        query_embedding: List[float],
        document_id: UUID,
        max_tokens: int = 3000
    ) -> str:
        """
        Retrieve relevant context passages for a claim
        Returns concatenated context string
        """
        passages = self.similarity_search(
            session=session,
            query_embedding=query_embedding,
            document_id=document_id,
            top_k=10,
            similarity_threshold=0.6
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

