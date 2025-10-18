# Greenwash Detector 🌱

AI-powered greenwashing detection for sustainability reports using Gemini API, RAG, and semantic analysis.

**Hackathon Tracks:** Best Environmental Hack • Best use of Gemini API

## Overview

Greenwash Detector analyzes sustainability reports and press releases to detect potential greenwashing by:
- Extracting environmental and climate claims
- Gathering supporting/contradicting evidence from source documents
- Scoring claims across multiple dimensions
- Providing traffic-light ratings (Red/Amber/Green) with citations

## Tech Stack

### Frontend
- **Next.js 14** with App Router & TypeScript
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **react-dropzone** for file uploads
- **Lucide React** for icons

### Backend
- **Python 3.11** with FastAPI
- **Gemini 2.5 Flash** for claim extraction and analysis
- **Gemini text-embedding-004** for embeddings
- **Postgres with pgvector** for vector similarity search
- **pdfplumber & PyMuPDF** for PDF parsing
- **LangChain** for text chunking

### Infrastructure
- **Docker Compose** for local development
- **SQLModel** for ORM
- **Structured logging** with structlog

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

### Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd Hack_Knight_project
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

3. **Start the services**
```bash
docker-compose up --build
```

This will start:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Postgres with pgvector:** localhost:5432

4. **Access the application**

Open http://localhost:3000 in your browser.

## Usage

### 1. Upload a Document

- Drag and drop a PDF sustainability report or click to browse
- The system will automatically extract text and create embeddings
- Processing takes 10-30 seconds depending on document size

### 2. Analyze the Document

- Click on a document from the list
- Click "Analyze Document" button
- Wait 1-2 minutes for the AI analysis to complete

### 3. Review Results

The analysis provides:
- **Claims List:** All extracted environmental claims
- **Traffic-Light Ratings:** Red (concerning), Amber (questionable), Green (credible)
- **Dimension Scores:** Integrity, Verifiability, Scope Coverage, Offset Dependency
- **Evidence:** Supporting/contradicting passages with citations
- **Page References:** Direct links to source material

## Architecture

### Data Flow

```
PDF Upload → Text Extraction → Chunking → Embeddings → Vector Store
     ↓
Analysis Trigger → Claim Extraction (Gemini) → Evidence Gathering (RAG) → Scoring → Results
```

### Database Schema

- **Company:** Organization information
- **Document:** Uploaded sustainability reports
- **Passage:** Text chunks with embeddings (RAG)
- **Claim:** Extracted environmental claims
- **Evidence:** Supporting/contradicting evidence
- **Score:** Dimension scores for each claim

## API Endpoints

### Documents
- `POST /api/documents/upload` - Upload PDF
- `GET /api/documents` - List all documents
- `GET /api/documents/{id}` - Get specific document

### Analysis
- `POST /api/documents/{id}/analyze` - Trigger full analysis
- `GET /api/documents/{id}/claims` - Get claims with evidence

### Companies
- `POST /api/companies` - Create company
- `GET /api/companies` - List companies

## Development

### Backend Only

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Only

```bash
cd frontend
npm install
npm run dev
```

### Run Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## Key Features

### 1. Intelligent Claim Extraction
Uses Gemini to identify and structure environmental claims with metadata:
- Claim type (target, achievement, plan, offset)
- Topic (net_zero, scope3, renewable, etc.)
- Numeric targets and baselines
- Emission scopes covered

### 2. RAG-based Evidence Gathering
- Semantic search using pgvector
- Context-aware evidence retrieval
- Citation tracking with page numbers

### 3. Multi-Dimensional Scoring
- **Integrity:** Evidence support/contradiction analysis
- **Verifiability:** Presence of specific data and baselines
- **Scope Coverage:** Emission scope comprehensiveness
- **Offset Dependency:** Reliance on offsets vs direct reductions

### 4. Traffic-Light Rating System
- **Green (70-100):** Well-supported, specific, verifiable claims
- **Amber (40-69):** Questionable or insufficiently supported
- **Red (0-39):** Contradicted or vague claims

## Configuration

### Environment Variables

**Backend (.env)**
```bash
DATABASE_URL=postgresql://greenwash:greenwash123@localhost:5432/greenwash_db
GEMINI_API_KEY=your_api_key_here
UPLOAD_DIR=./uploads
```

**Frontend (.env.local)**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
PYTHON_API_URL=http://localhost:8000
```

## Deployment

### Production Build

```bash
docker-compose -f docker-compose.prod.yml up --build
```

### Cloud Deployment Options

- **Vercel** (Frontend) + **Railway** (Backend + DB)
- **Google Cloud Run** (Both services)
- **AWS ECS** with RDS (Postgres with pgvector)

## Troubleshooting

### Common Issues

**1. PDF extraction fails**
- Ensure tesseract-ocr is installed
- Check if PDF has selectable text

**2. Gemini API errors**
- Verify API key is correct
- Check rate limits
- Ensure you have API access enabled

**3. pgvector errors**
- Verify pgvector extension is installed
- Check Postgres version (requires 12+)

**4. Frontend can't connect to backend**
- Check CORS settings in backend
- Verify proxy configuration in next.config.js

## Future Enhancements

- [ ] PDF preview with highlighting
- [ ] Comparison across multiple reports
- [ ] Historical trend analysis
- [ ] Export reports as PDF
- [ ] Multi-language support
- [ ] Integration with external data sources
- [ ] Machine learning for improved scoring

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Google Gemini API for powerful language models
- pgvector for efficient vector similarity search
- LangChain for text processing utilities
- shadcn/ui for component inspiration

## Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ for environmental transparency

