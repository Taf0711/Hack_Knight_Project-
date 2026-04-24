from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, field_validator


ClaimType = Literal["target", "achievement", "commitment", "plan"]
ClaimTopic = Literal[
    "emissions_reduction",
    "net_zero",
    "renewable_energy",
    "waste_circularity",
    "water",
    "biodiversity",
    "supply_chain",
    "other",
]
EvidenceStance = Literal["supports", "contradicts", "insufficient"]
OverallRating = Literal["red", "amber", "green"]
DocumentSegmentType = Literal["page", "section", "extraction_batch"]

CLAIM_TYPE_VALUES = {"target", "achievement", "commitment", "plan"}
CLAIM_TOPIC_VALUES = {
    "emissions_reduction",
    "net_zero",
    "renewable_energy",
    "waste_circularity",
    "water",
    "biodiversity",
    "supply_chain",
    "other",
}
EVIDENCE_STANCE_VALUES = {"supports", "contradicts", "insufficient"}
OVERALL_RATING_VALUES = {"red", "amber", "green"}


class CitationValidationResponse(BaseModel):
    verified: bool
    best_match: Optional[str] = None
    similarity: Optional[float] = None
    passage_index: Optional[int] = None
    method: Optional[str] = None
    reason: Optional[str] = None


class CitationResponse(BaseModel):
    passage_id: Optional[str] = None
    page: Optional[int] = None
    snippet: Optional[str] = None
    document_id: Optional[str] = None
    validation: Optional[CitationValidationResponse] = None


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


class DocumentSegmentResponse(BaseModel):
    segment_id: str
    segment_type: DocumentSegmentType
    title: str
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    pages: List[int]
    char_count: int
    preview: Optional[str] = None
    text: Optional[str] = None
    segment_ids: Optional[List[str]] = None


class DocumentSegmentsResponse(BaseModel):
    document_id: UUID
    total_pages: int
    pages: List[DocumentSegmentResponse]
    sections: List[DocumentSegmentResponse]
    extraction_batches: List[DocumentSegmentResponse]


class ClaimResponse(BaseModel):
    id: UUID
    claim_text: str
    claim_type: Optional[ClaimType] = None
    topic: Optional[ClaimTopic] = None
    target_year: Optional[int] = None
    baseline_year: Optional[int] = None
    scope_covered: Optional[List[str]] = None
    numeric_value: Optional[float] = None
    units: Optional[str] = None
    page: Optional[int] = None
    confidence: Optional[int] = None

    @field_validator("claim_type", mode="before")
    @classmethod
    def normalize_claim_type(cls, value):
        if value is None:
            return value
        return value if value in CLAIM_TYPE_VALUES else "commitment"

    @field_validator("topic", mode="before")
    @classmethod
    def normalize_topic(cls, value):
        if value is None:
            return value
        return value if value in CLAIM_TOPIC_VALUES else "other"


class EvidenceResponse(BaseModel):
    id: Optional[UUID] = None
    source_type: Optional[str] = None
    stance: Optional[EvidenceStance] = None
    strength: Optional[int] = None
    confidence: Optional[int] = None
    rationale: Optional[str] = None
    reasoning_steps: Optional[List[str]] = None
    citations: Optional[List[CitationResponse]] = None

    @field_validator("stance", mode="before")
    @classmethod
    def normalize_stance(cls, value):
        if value is None:
            return value
        return value if value in EVIDENCE_STANCE_VALUES else "insufficient"


class ScoreResponse(BaseModel):
    dimension: str
    value: float
    explanation: Optional[str] = None


class ClaimWithEvidenceResponse(ClaimResponse):
    evidence: List[EvidenceResponse]
    scores: List[ScoreResponse]
    overall_rating: OverallRating

    @field_validator("overall_rating", mode="before")
    @classmethod
    def normalize_overall_rating(cls, value):
        if value is None:
            return "red"
        return value if value in OVERALL_RATING_VALUES else "red"


class AnalysisResponse(BaseModel):
    document_id: UUID
    claims: List[ClaimWithEvidenceResponse]
    total_claims: int
