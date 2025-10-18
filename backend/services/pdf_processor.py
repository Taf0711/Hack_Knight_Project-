import hashlib
import pdfplumber
import fitz  # PyMuPDF
from pathlib import Path
from typing import Dict, List, Tuple
import structlog

logger = structlog.get_logger()


class PDFProcessor:
    """Extract text and metadata from PDF files"""
    
    def __init__(self):
        self.logger = logger.bind(service="pdf_processor")
    
    def calculate_sha256(self, file_path: str) -> str:
        """Calculate SHA256 hash of file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def extract_text_pdfplumber(self, file_path: str) -> Tuple[str, Dict[int, str]]:
        """
        Extract text using pdfplumber
        Returns: (full_text, page_dict)
        """
        full_text = []
        page_dict = {}
        
        try:
            with pdfplumber.open(file_path) as pdf:
                for i, page in enumerate(pdf.pages, start=1):
                    text = page.extract_text() or ""
                    page_dict[i] = text
                    full_text.append(text)
            
            return "\n\n".join(full_text), page_dict
        except Exception as e:
            self.logger.error("pdfplumber extraction failed", error=str(e))
            raise
    
    def extract_text_pymupdf(self, file_path: str) -> Tuple[str, Dict[int, str]]:
        """
        Extract text using PyMuPDF (fallback method)
        Returns: (full_text, page_dict)
        """
        full_text = []
        page_dict = {}
        
        try:
            doc = fitz.open(file_path)
            for i, page in enumerate(doc, start=1):
                text = page.get_text()
                page_dict[i] = text
                full_text.append(text)
            doc.close()
            
            return "\n\n".join(full_text), page_dict
        except Exception as e:
            self.logger.error("pymupdf extraction failed", error=str(e))
            raise
    
    def extract_tables(self, file_path: str) -> List[Dict]:
        """Extract tables from PDF (optional enhancement)"""
        tables = []
        
        try:
            with pdfplumber.open(file_path) as pdf:
                for i, page in enumerate(pdf.pages, start=1):
                    page_tables = page.extract_tables()
                    for table in page_tables:
                        if table:
                            tables.append({
                                "page": i,
                                "data": table
                            })
        except Exception as e:
            self.logger.warning("table extraction failed", error=str(e))
        
        return tables
    
    def process_pdf(self, file_path: str) -> Dict:
        """
        Main method to process PDF
        Returns structured data about the PDF
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Calculate hash
        sha256 = self.calculate_sha256(str(file_path))
        
        # Extract text (try pdfplumber first, fallback to pymupdf)
        try:
            full_text, page_dict = self.extract_text_pdfplumber(str(file_path))
        except Exception:
            self.logger.warning("pdfplumber failed, trying pymupdf")
            full_text, page_dict = self.extract_text_pymupdf(str(file_path))
        
        # Extract tables
        tables = self.extract_tables(str(file_path))
        
        return {
            "sha256": sha256,
            "full_text": full_text,
            "page_dict": page_dict,
            "tables": tables,
            "num_pages": len(page_dict)
        }

