from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    ticker: Optional[str] = None


class CompanyResponse(BaseModel):
    id: UUID
    name: str
    ticker: Optional[str] = None
    created_at: datetime


class DocumentUploadResponse(BaseModel):
    id: UUID
    title: str
    sha256: str
    mime: str
    created_at: datetime


class ClaimResponse(BaseModel):
    id: UUID
    claim_text: str
    claim_type: Optional[str] = None
    topic: Optional[str] = None
    target_year: Optional[int] = None
    baseline_year: Optional[int] = None
    scope_covered: Optional[List[str]] = None
    numeric_value: Optional[float] = None
    units: Optional[str] = None
    page: Optional[int] = None


class EvidenceResponse(BaseModel):
    id: Optional[UUID] = None
    source_type: Optional[str] = None
    stance: Optional[str] = None
    strength: Optional[int] = None
    rationale: Optional[str] = None
    citations: Optional[List[dict]] = None


class ScoreResponse(BaseModel):
    dimension: str
    value: float
    explanation: Optional[str] = None


class ClaimWithEvidenceResponse(ClaimResponse):
    evidence: List[EvidenceResponse]
    scores: List[ScoreResponse]
    overall_rating: str  # "red" | "amber" | "green"


class AnalysisResponse(BaseModel):
    document_id: UUID
    claims: List[ClaimWithEvidenceResponse]
    total_claims: int

