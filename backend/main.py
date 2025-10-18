from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import Optional, List
from uuid import UUID
import os
import structlog
import shutil

from database import get_session, init_db
from models.database import Company, Document, Passage, Claim, Evidence, Score
from models.schemas import (
    CompanyCreate, CompanyResponse, DocumentUploadResponse,
    ClaimWithEvidenceResponse, AnalysisResponse, EvidenceResponse, ScoreResponse
)
from services.pdf_processor import PDFProcessor
from services.embeddings import EmbeddingService
from services.rag import RAGService
from services.claim_extractor import ClaimExtractor
from services.evidence_analyzer import EvidenceAnalyzer
from services.scorer import ClaimScorer
from config import UPLOAD_DIR

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

app = FastAPI(
    title="Greenwash Detector API",
    description="API for detecting greenwashing in sustainability reports",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
pdf_processor = PDFProcessor()
embedding_service = EmbeddingService()
rag_service = RAGService()
claim_extractor = ClaimExtractor()
evidence_analyzer = EvidenceAnalyzer()
scorer = ClaimScorer()


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    logger.info("Starting up Greenwash Detector API")
    # init_db()  # Uncomment if not using schema.sql


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Greenwash Detector API"}


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "services": ["pdf", "embeddings", "rag", "claims", "evidence", "scorer"]
    }


# ============= Company Endpoints =============

@app.post("/api/companies", response_model=CompanyResponse)
async def create_company(
    company: CompanyCreate,
    session: Session = Depends(get_session)
):
    """Create a new company"""
    db_company = Company(**company.model_dump())
    session.add(db_company)
    session.commit()
    session.refresh(db_company)
    
    logger.info(f"Created company: {db_company.name}")
    return db_company


@app.get("/api/companies", response_model=List[CompanyResponse])
async def list_companies(session: Session = Depends(get_session)):
    """List all companies"""
    companies = session.exec(select(Company)).all()
    return list(companies)


@app.get("/api/companies/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: UUID,
    session: Session = Depends(get_session)
):
    """Get a specific company"""
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ============= Document Endpoints =============

@app.post("/api/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    company_id: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    source_url: Optional[str] = Form(None),
    session: Session = Depends(get_session)
):
    """Upload a PDF document"""
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    logger.info(f"Uploaded file: {file.filename}")
    
    try:
        # Process PDF
        pdf_data = pdf_processor.process_pdf(file_path)
        
        # Check for duplicates
        existing = session.exec(
            select(Document).where(Document.sha256 == pdf_data["sha256"])
        ).first()
        
        if existing:
            logger.warning(f"Duplicate document detected: {pdf_data['sha256']}")
            return existing
        
        # Create document record
        document = Document(
            company_id=UUID(company_id) if company_id else None,
            title=title or file.filename,
            year=year,
            source_url=source_url,
            mime="application/pdf",
            sha256=pdf_data["sha256"],
            file_path=file_path
        )
        
        session.add(document)
        session.commit()
        session.refresh(document)
        
        # Create chunks and embeddings asynchronously
        chunks = embedding_service.chunk_text(
            pdf_data["full_text"],
            pdf_data["page_dict"]
        )
        
        logger.info(f"Creating {len(chunks)} passages")
        
        # Generate embeddings and store passages
        for chunk in chunks:
            embedding = embedding_service.generate_embedding(chunk["text"])
            
            passage = Passage(
                document_id=document.id,
                page=chunk["page"],
                text=chunk["text"],
                embedding=embedding,
                char_start=chunk["char_start"],
                char_end=chunk["char_end"]
            )
            session.add(passage)
        
        session.commit()
        
        logger.info(f"Document processed: {document.id}")
        return document
        
    except Exception as e:
        logger.error(f"Document upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.get("/api/documents")
async def list_documents(session: Session = Depends(get_session)):
    """List all documents"""
    documents = session.exec(select(Document)).all()
    return list(documents)


@app.get("/api/documents/{document_id}")
async def get_document(
    document_id: UUID,
    session: Session = Depends(get_session)
):
    """Get a specific document"""
    document = session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


# ============= Analysis Endpoints =============

@app.post("/api/documents/{document_id}/analyze", response_model=AnalysisResponse)
async def analyze_document(
    document_id: UUID,
    session: Session = Depends(get_session)
):
    """
    Analyze a document for greenwashing
    This performs the full pipeline: claim extraction → evidence gathering → scoring
    """
    document = session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    logger.info(f"Starting analysis for document: {document_id}")
    
    try:
        # Get document text from passages
        passages = rag_service.get_passages_by_document(session, document_id)
        if not passages:
            raise HTTPException(status_code=400, detail="Document has no processed passages")
        
        full_text = "\n\n".join([p.text for p in passages])
        page_dict = {p.page: p.text for p in passages if p.page}
        
        # Extract claims
        logger.info("Extracting claims...")
        claims_data = claim_extractor.extract_claims(full_text, page_dict)
        
        results = []
        
        # Process each claim
        for claim_data in claims_data:
            # Save claim to database
            claim = Claim(
                document_id=document_id,
                claim_text=claim_data.get("claim_text"),
                claim_type=claim_data.get("claim_type"),
                topic=claim_data.get("topic"),
                target_year=claim_data.get("target_year"),
                baseline_year=claim_data.get("baseline_year"),
                scope_covered=claim_data.get("scope_covered"),
                numeric_value=claim_data.get("numeric_value"),
                units=claim_data.get("units"),
                page=claim_data.get("page")
            )
            session.add(claim)
            session.flush()
            
            # Get context for evidence analysis
            query_embedding = embedding_service.generate_query_embedding(claim.claim_text)
            context = rag_service.get_context_for_claim(
                session=session,
                claim_text=claim.claim_text,
                query_embedding=query_embedding,
                document_id=document_id
            )
            
            # Get relevant passages
            relevant_passages = rag_service.similarity_search(
                session=session,
                query_embedding=query_embedding,
                document_id=document_id,
                top_k=5
            )
            
            # Analyze evidence
            logger.info(f"Analyzing evidence for claim: {claim.claim_text[:50]}...")
            evidence_data = evidence_analyzer.analyze_claim(
                claim.claim_text,
                relevant_passages
            )
            
            # Save evidence
            evidence = Evidence(
                claim_id=claim.id,
                source_type="report",
                stance=evidence_data.get("stance"),
                strength=evidence_data.get("strength"),
                rationale=evidence_data.get("rationale"),
                citations=evidence_data.get("citations")
            )
            session.add(evidence)
            session.flush()
            
            # Score the claim
            scores, overall_rating = scorer.score_claim(
                claim_data,
                [evidence_data]
            )
            
            # Save scores
            for score_data in scores:
                score = Score(
                    claim_id=claim.id,
                    dimension=score_data["dimension"],
                    value=score_data["value"],
                    explanation=score_data["explanation"]
                )
                session.add(score)
            
            session.flush()
            
            # Build response
            results.append({
                **claim_data,
                "id": claim.id,
                "evidence": [EvidenceResponse(**evidence_data)],
                "scores": [ScoreResponse(**s) for s in scores],
                "overall_rating": overall_rating
            })
        
        session.commit()
        
        logger.info(f"Analysis complete: {len(results)} claims found")
        
        return AnalysisResponse(
            document_id=document_id,
            claims=results,
            total_claims=len(results)
        )
        
    except Exception as e:
        session.rollback()
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/api/documents/{document_id}/claims", response_model=List[ClaimWithEvidenceResponse])
async def get_document_claims(
    document_id: UUID,
    session: Session = Depends(get_session)
):
    """Get all claims for a document with evidence and scores"""
    document = session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get claims with related data
    claims = session.exec(
        select(Claim).where(Claim.document_id == document_id)
    ).all()
    
    results = []
    for claim in claims:
        # Get evidence
        evidence_list = session.exec(
            select(Evidence).where(Evidence.claim_id == claim.id)
        ).all()
        
        # Get scores
        scores = session.exec(
            select(Score).where(Score.claim_id == claim.id)
        ).all()
        
        # Calculate overall rating from scores
        if scores:
            avg_score = sum(s.value for s in scores) / len(scores)
            overall_rating = "green" if avg_score >= 70 else "amber" if avg_score >= 40 else "red"
        else:
            overall_rating = "red"
        
        results.append(ClaimWithEvidenceResponse(
            id=claim.id,
            claim_text=claim.claim_text,
            claim_type=claim.claim_type,
            topic=claim.topic,
            target_year=claim.target_year,
            baseline_year=claim.baseline_year,
            scope_covered=claim.scope_covered,
            numeric_value=claim.numeric_value,
            units=claim.units,
            page=claim.page,
            evidence=[EvidenceResponse(
                id=e.id,
                source_type=e.source_type,
                stance=e.stance,
                strength=e.strength,
                rationale=e.rationale,
                citations=e.citations
            ) for e in evidence_list],
            scores=[ScoreResponse(
                dimension=s.dimension,
                value=s.value,
                explanation=s.explanation
            ) for s in scores],
            overall_rating=overall_rating
        ))
    
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

