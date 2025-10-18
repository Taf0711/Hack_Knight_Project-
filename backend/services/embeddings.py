from typing import List, Dict
from google import genai
from google.genai import types
from langchain_text_splitters import RecursiveCharacterTextSplitter
import structlog
from config import GEMINI_API_KEY
import os

logger = structlog.get_logger()


class EmbeddingService:
    """Generate embeddings using Gemini API"""
    
    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.logger = logger.bind(service="embeddings")
        self.model_name = "text-embedding-004"
    
    def chunk_text(self, text: str, page_dict: Dict[int, str] = None) -> List[Dict]:
        """
        Split text into chunks with metadata
        Returns list of dicts with: text, char_start, char_end, page
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        chunks = []
        
        if page_dict:
            # Chunk per page to maintain page references
            current_pos = 0
            for page_num, page_text in sorted(page_dict.items()):
                page_chunks = splitter.split_text(page_text)
                
                for chunk_text in page_chunks:
                    char_start = current_pos
                    char_end = current_pos + len(chunk_text)
                    
                    chunks.append({
                        "text": chunk_text,
                        "page": page_num,
                        "char_start": char_start,
                        "char_end": char_end
                    })
                    
                    current_pos = char_end
        else:
            # Simple chunking without page info
            text_chunks = splitter.split_text(text)
            current_pos = 0
            
            for chunk_text in text_chunks:
                char_start = current_pos
                char_end = current_pos + len(chunk_text)
                
                chunks.append({
                    "text": chunk_text,
                    "page": None,
                    "char_start": char_start,
                    "char_end": char_end
                })
                
                current_pos = char_end
        
        self.logger.info(f"Created {len(chunks)} chunks from text")
        return chunks
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        try:
            result = self.client.models.embed_content(
                model=self.model_name,
                contents=text
            )
            return result.embeddings[0].values
        except Exception as e:
            self.logger.error("embedding generation failed", error=str(e))
            raise
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        embeddings = []
        
        # Process in batches to avoid rate limits
        batch_size = 50
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            try:
                for text in batch:
                    embedding = self.generate_embedding(text)
                    embeddings.append(embedding)
            except Exception as e:
                self.logger.error(f"batch embedding failed at index {i}", error=str(e))
                # Continue with remaining batches
                continue
        
        self.logger.info(f"Generated {len(embeddings)} embeddings")
        return embeddings
    
    def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for search query"""
        try:
            result = self.client.models.embed_content(
                model=self.model_name,
                contents=query
            )
            return result.embeddings[0].values
        except Exception as e:
            self.logger.error("query embedding failed", error=str(e))
            raise

