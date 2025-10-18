# Greenwash Detector - Architecture Documentation

## System Overview

The Greenwash Detector is a full-stack application that uses AI and RAG (Retrieval-Augmented Generation) to analyze sustainability reports for potential greenwashing.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                         (localhost:3000)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Next.js 14    │
                    │   Frontend      │
                    │   - React Query │
                    │   - Tailwind    │
                    └────────┬────────┘
                             │ HTTP/REST
                    ┌────────▼────────┐
                    │   FastAPI       │
                    │   Backend       │
                    │   (port 8000)   │
                    └────┬───────┬────┘
                         │       │
              ┌──────────┘       └──────────┐
              │                             │
     ┌────────▼────────┐          ┌────────▼────────┐
     │  Gemini API     │          │   PostgreSQL    │
     │  - GPT-4 level  │          │   + pgvector    │
     │  - Embeddings   │          │   (port 5432)   │
     └─────────────────┘          └─────────────────┘
```

## Component Architecture

### Frontend (Next.js)

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout with navigation
│   ├── page.tsx                # Home page with upload
│   └── documents/[id]/
│       └── page.tsx            # Document analysis page
├── components/
│   ├── ui/                     # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   └── Card.tsx
│   ├── upload/
│   │   └── DocumentUpload.tsx # Drag-and-drop upload
│   ├── documents/
│   │   └── DocumentList.tsx   # Document listing
│   └── results/
│       └── ClaimsList.tsx     # Analysis results display
└── lib/
    ├── api.ts                  # API client
    ├── utils.ts                # Helper functions
    └── query-provider.tsx      # React Query setup
```

### Backend (Python/FastAPI)

```
backend/
├── main.py                     # FastAPI app & endpoints
├── config.py                   # Configuration
├── database.py                 # Database connection
├── models/
│   ├── database.py            # SQLModel ORM models
│   └── schemas.py             # Pydantic response models
└── services/
    ├── pdf_processor.py       # PDF extraction
    ├── embeddings.py          # Gemini embeddings
    ├── rag.py                 # Vector similarity search
    ├── claim_extractor.py     # AI claim extraction
    ├── evidence_analyzer.py   # Evidence analysis
    └── scorer.py              # Scoring algorithm
```

## Data Flow

### 1. Document Upload Flow

```
User uploads PDF
    ↓
Frontend: react-dropzone captures file
    ↓
API: POST /api/documents/upload
    ↓
pdf_processor.py: Extract text & metadata
    ↓
Calculate SHA256 hash (deduplication)
    ↓
embedding_service.py: Chunk text (800-1200 tokens)
    ↓
Generate embeddings (Gemini text-embedding-004)
    ↓
Store in PostgreSQL:
    - Document record
    - Passage records with vectors
    ↓
Return document ID to frontend
```

### 2. Analysis Flow

```
User clicks "Analyze"
    ↓
API: POST /api/documents/{id}/analyze
    ↓
claim_extractor.py:
    - Load document text
    - Call Gemini with extraction prompt
    - Parse JSON response into structured claims
    ↓
For each claim:
    ├─> rag.py: Similarity search for relevant passages
    │       - Generate query embedding
    │       - pgvector cosine similarity search
    │       - Return top-k passages
    │
    ├─> evidence_analyzer.py:
    │       - Call Gemini with claim + context
    │       - Get stance (supports/contradicts/insufficient)
    │       - Extract rationale and strength
    │       - Build citations
    │
    └─> scorer.py:
            - Score integrity (evidence quality)
            - Score verifiability (specificity)
            - Score scope coverage
            - Score offset dependency
            - Calculate weighted average
            - Determine traffic-light rating
    ↓
Store in database:
    - Claim records
    - Evidence records
    - Score records
    ↓
Return analysis results to frontend
```

### 3. Display Flow

```
Frontend receives analysis
    ↓
ClaimsList component renders:
    ├─> Traffic-light badges (🔴🟡🟢)
    ├─> Claim metadata (type, topic, page)
    └─> Expandable details:
        ├─> Dimension scores with progress bars
        ├─> Evidence analysis
        └─> Citations with page references
```

## Key Technologies

### RAG (Retrieval-Augmented Generation)

**Why RAG?**
- Grounds AI analysis in actual document text
- Reduces hallucinations
- Provides traceable citations
- Enables semantic search beyond keyword matching

**Implementation:**
1. **Chunking:** Split documents into 800-1200 token passages
2. **Embedding:** Convert to 768-dim vectors via Gemini
3. **Storage:** Store in PostgreSQL with pgvector extension
4. **Retrieval:** Cosine similarity search for relevant passages
5. **Generation:** Pass retrieved context to Gemini for analysis

### Vector Similarity Search

**pgvector Extension:**
- Efficient approximate nearest neighbor (ANN) search
- IVFFlat index for fast retrieval
- Cosine distance metric
- SQL-native (no separate vector DB needed)

**Query Example:**
```sql
SELECT id, text, 1 - (embedding <=> query_vector) as similarity
FROM passage
WHERE document_id = ?
ORDER BY embedding <=> query_vector
LIMIT 5;
```

### Gemini API Integration

**Models Used:**
- `gemini-2-5-flash` - Claim extraction & evidence analysis
- `text-embedding-004` - 768-dim embeddings

**Prompt Engineering:**
- Structured JSON output format
- Clear task instructions
- Few-shot examples in system prompts
- Temperature settings for consistency

## Database Schema

### Entity Relationship

```
Company (1) ─────< (N) Document
                        │
                        ├─────< (N) Passage [embeddings]
                        │
                        └─────< (N) Claim
                                     │
                                     ├─────< (N) Evidence
                                     │
                                     └─────< (N) Score
```

### Key Tables

**Document**
- Stores uploaded PDF metadata
- SHA256 for deduplication
- Links to company

**Passage**
- Text chunks from documents
- 768-dim embedding vectors
- Page references for citations

**Claim**
- Extracted environmental claims
- Structured metadata (type, topic, targets)
- Links back to source document

**Evidence**
- Analysis of each claim
- Stance classification
- Rationale and citations

**Score**
- Multi-dimensional scoring
- Dimension-specific explanations
- Used to calculate overall rating

## API Design

### RESTful Endpoints

**Documents:**
- `POST /api/documents/upload` - Multipart form data
- `GET /api/documents` - List all
- `GET /api/documents/{id}` - Get one

**Analysis:**
- `POST /api/documents/{id}/analyze` - Trigger analysis (async)
- `GET /api/documents/{id}/claims` - Get results

**Companies:**
- `POST /api/companies` - Create
- `GET /api/companies` - List all

### Response Format

```json
{
  "document_id": "uuid",
  "claims": [
    {
      "id": "uuid",
      "claim_text": "We will be net-zero by 2030",
      "claim_type": "target",
      "topic": "net_zero",
      "target_year": 2030,
      "overall_rating": "amber",
      "scores": [
        {
          "dimension": "integrity",
          "value": 65.0,
          "explanation": "..."
        }
      ],
      "evidence": [
        {
          "stance": "insufficient",
          "strength": 1,
          "rationale": "...",
          "citations": [
            {
              "page": 12,
              "snippet": "..."
            }
          ]
        }
      ]
    }
  ]
}
```

## Security Considerations

### Current Implementation

1. **Input Validation:**
   - File type checking (PDF only)
   - File size limits (50MB)
   - SQL injection protection (SQLModel ORM)

2. **CORS:**
   - Configured for local development
   - Should be restricted in production

3. **Environment Variables:**
   - API keys in .env (not committed)
   - Database credentials externalized

### Production Enhancements Needed

- [ ] API rate limiting
- [ ] User authentication
- [ ] File upload size limits
- [ ] Malware scanning
- [ ] HTTPS/TLS
- [ ] Input sanitization
- [ ] SQL query limits

## Performance Considerations

### Optimization Strategies

1. **Embeddings:**
   - Batch processing (50 chunks at a time)
   - Caching in database
   - Only generate once per document

2. **Vector Search:**
   - IVFFlat index for fast ANN
   - Limit search scope to document
   - Top-k limiting (5-10 results)

3. **API Calls:**
   - Batch Gemini requests where possible
   - Implement retry logic with backoff
   - Cache results in database

4. **Frontend:**
   - React Query caching
   - Lazy loading of results
   - Optimistic updates

### Bottlenecks

1. **Gemini API:**
   - Rate limits (60 requests/min)
   - Latency (1-3 seconds per call)
   - Solution: Queue + async processing

2. **PDF Processing:**
   - Large documents (100+ pages)
   - OCR fallback (slow)
   - Solution: Background jobs

3. **Embedding Generation:**
   - 100+ chunks per document
   - Sequential processing
   - Solution: Batch API + parallelization

## Scalability

### Horizontal Scaling

**Current:**
- Stateless API (easy to scale)
- Postgres (single instance)

**Production:**
- Multiple API replicas behind load balancer
- Read replicas for database
- Redis for caching and job queues
- S3 for file storage

### Vertical Scaling

- Increase Postgres resources for vector operations
- GPU acceleration for embeddings (future)
- Larger API instance for more concurrent requests

## Monitoring & Observability

### Logging

- Structured JSON logs (structlog)
- Log levels: INFO, WARNING, ERROR
- Request/response logging
- Error tracking with stack traces

### Metrics (Future)

- Request latency
- API call duration
- Database query performance
- Error rates
- Document processing time

## Deployment

### Development

```bash
docker-compose up
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up
```

**Recommended Infrastructure:**
- **Frontend:** Vercel or Netlify
- **Backend:** Google Cloud Run or AWS ECS
- **Database:** Managed Postgres with pgvector (Supabase, RDS)
- **Files:** S3 or Google Cloud Storage

## Future Enhancements

### Technical

1. **Async Processing:**
   - Celery/Redis for background jobs
   - Webhook notifications
   - Email alerts

2. **Caching:**
   - Redis for API responses
   - Memoization of Gemini calls
   - CDN for static assets

3. **Advanced RAG:**
   - Hybrid search (vector + keyword)
   - Reranking models
   - Query expansion

### Features

1. **Comparison Mode:**
   - Side-by-side document comparison
   - Historical trend analysis
   - Industry benchmarking

2. **External Validation:**
   - Integration with climate databases
   - Fact-checking APIs
   - News article cross-referencing

3. **Export & Reporting:**
   - PDF report generation
   - CSV export
   - API for third-party integration

## Testing Strategy

### Unit Tests

- Service layer logic
- Scoring algorithms
- Utility functions

### Integration Tests

- API endpoints
- Database operations
- Gemini API mocking

### E2E Tests

- Upload → Analyze → Display flow
- Error handling
- Edge cases (empty PDFs, large files)

## Contributing

See main README.md for contribution guidelines.

## License

MIT License - see LICENSE file

