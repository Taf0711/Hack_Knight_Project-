from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship, Column, JSON
from pgvector.sqlalchemy import Vector


class Company(SQLModel, table=True):
    __tablename__ = "company"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    ticker: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    documents: List["Document"] = Relationship(back_populates="company")


class Document(SQLModel, table=True):
    __tablename__ = "document"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    company_id: Optional[UUID] = Field(default=None, foreign_key="company.id")
    title: str
    year: Optional[int] = None
    source_url: Optional[str] = None
    mime: str
    sha256: str = Field(unique=True, index=True)
    uploaded_by: Optional[str] = None
    file_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    company: Optional[Company] = Relationship(back_populates="documents")
    passages: List["Passage"] = Relationship(back_populates="document")
    claims: List["Claim"] = Relationship(back_populates="document")


class Passage(SQLModel, table=True):
    __tablename__ = "passage"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="document.id")
    page: Optional[int] = None
    text: str
    embedding: Optional[List[float]] = Field(default=None, sa_column=Column(Vector(768)))
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    document: Document = Relationship(back_populates="passages")


class Claim(SQLModel, table=True):
    __tablename__ = "claim"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="document.id")
    page: Optional[int] = None
    claim_text: str
    claim_type: Optional[str] = None  # "target" | "achievement" | "plan" | "offset"
    topic: Optional[str] = None  # "net_zero" | "scope3" | "renewable"
    target_year: Optional[int] = None
    baseline_year: Optional[int] = None
    scope_covered: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    numeric_value: Optional[float] = None
    units: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    document: Document = Relationship(back_populates="claims")
    evidence: List["Evidence"] = Relationship(back_populates="claim")
    scores: List["Score"] = Relationship(back_populates="claim")


class Evidence(SQLModel, table=True):
    __tablename__ = "evidence"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    claim_id: UUID = Field(foreign_key="claim.id")
    passage_id: Optional[UUID] = Field(default=None, foreign_key="passage.id")
    source_type: Optional[str] = None  # "report" | "news" | "website"
    stance: Optional[str] = None  # "supports" | "contradicts" | "insufficient"
    strength: Optional[int] = None  # 0..3
    rationale: Optional[str] = None
    citations: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    claim: Claim = Relationship(back_populates="evidence")


class Score(SQLModel, table=True):
    __tablename__ = "score"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    claim_id: UUID = Field(foreign_key="claim.id")
    dimension: str  # "integrity" | "verifiability" | "scope_coverage" | "offset_dependency"
    value: float  # 0..100
    explanation: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    claim: Claim = Relationship(back_populates="scores")

