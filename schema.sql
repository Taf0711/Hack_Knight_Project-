-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Company table
CREATE TABLE IF NOT EXISTS company (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    ticker TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document table
CREATE TABLE IF NOT EXISTS document (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES company(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    year INTEGER,
    source_url TEXT,
    mime TEXT NOT NULL,
    sha256 CHAR(64) UNIQUE NOT NULL,
    uploaded_by TEXT,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Passage table (RAG chunks)
CREATE TABLE IF NOT EXISTS passage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    page INTEGER,
    text TEXT NOT NULL,
    embedding vector(768),
    char_start INTEGER,
    char_end INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim table
CREATE TABLE IF NOT EXISTS claim (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    page INTEGER,
    claim_text TEXT NOT NULL,
    claim_type TEXT,  -- "target" | "achievement" | "plan" | "offset" | ...
    topic TEXT,       -- "net_zero" | "scope3" | "renewable" | ...
    target_year INTEGER,
    baseline_year INTEGER,
    scope_covered JSONB,  -- ["S1","S2","S3"]
    numeric_value FLOAT,
    units TEXT,       -- "%", "tCO2e", "MWh", etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence table
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    passage_id UUID REFERENCES passage(id) ON DELETE SET NULL,
    source_type TEXT,     -- "report" | "news" | "website"
    stance TEXT,          -- "supports" | "contradicts" | "insufficient"
    strength INTEGER,     -- 0..3
    rationale TEXT,
    citations JSONB,      -- [{document_id, page, snippet}]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Score table
CREATE TABLE IF NOT EXISTS score (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL,  -- "integrity" | "verifiability" | "scope_coverage" | "offset_dependency"
    value FLOAT NOT NULL,     -- 0..100
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_company ON document(company_id);
CREATE INDEX IF NOT EXISTS idx_document_sha256 ON document(sha256);
CREATE INDEX IF NOT EXISTS idx_passage_document ON passage(document_id);
CREATE INDEX IF NOT EXISTS idx_passage_embedding ON passage USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_claim_document ON claim(document_id);
CREATE INDEX IF NOT EXISTS idx_evidence_claim ON evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_score_claim ON score(claim_id);

