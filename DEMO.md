# Greenwash Detector - Demo Guide

## For Hackathon Judges

This guide will help you quickly demo the Greenwash Detector application.

## Setup (5 minutes)

1. **Prerequisites Check**
   ```bash
   docker --version  # Should be 20.10+
   docker-compose --version  # Should be 1.29+
   ```

2. **Get Gemini API Key**
   - Visit: https://makersuite.google.com/app/apikey
   - Click "Create API Key"
   - Copy the key

3. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Add your GEMINI_API_KEY
   ```

4. **Start Services**
   ```bash
   docker-compose up --build
   ```
   
   Wait for:
   - ✅ Postgres ready
   - ✅ Backend API running on :8000
   - ✅ Frontend running on :3000

5. **Access Application**
   - Open: http://localhost:3000

## Demo Scenario (10 minutes)

### Act 1: Upload Document (2 min)

1. **Navigate to Home Page**
   - You'll see the upload interface

2. **Prepare Sample PDF**
   - Use any sustainability report PDF
   - Recommended: Search for "[Company Name] sustainability report PDF"
   - Examples:
     - Microsoft Environmental Sustainability Report
     - Apple Environmental Progress Report
     - Any corporate ESG/sustainability report

3. **Upload the Document**
   - Drag & drop or click to select
   - Wait for "Document uploaded successfully!" message
   - Document appears in "Recent Documents" list

### Act 2: Analyze Document (5 min)

1. **Open Document**
   - Click on the uploaded document in the list
   - You'll see the document details page

2. **Trigger Analysis**
   - Click "Analyze Document" button
   - Watch the progress indicator
   - Analysis takes 1-2 minutes (good time to explain the tech)

3. **Explain the Process** (while waiting)
   - "The AI is now extracting environmental claims..."
   - "Using Gemini 2.5 Flash for fast, accurate natural language understanding"
   - "Performing semantic search with pgvector for evidence gathering"
   - "Scoring across 4 dimensions: integrity, verifiability, scope, offsets"

### Act 3: Review Results (3 min)

1. **Claims Overview**
   - Show the traffic-light badges (🔴🟡🟢)
   - Point out claim types and topics
   - Highlight page references

2. **Deep Dive on One Claim**
   - Click to expand a claim (preferably an amber or red one)
   - Walk through:
     - **Dimension Scores**: Show the progress bars and explanations
     - **Evidence Analysis**: Highlight the stance (supports/contradicts)
     - **Citations**: Show page numbers and text snippets

3. **Compare Different Ratings**
   - Show a green claim vs. a red claim
   - Explain what makes them different
   - Point out specific evidence

## Key Talking Points

### Technical Innovation

- **RAG Architecture**: "We're using Retrieval-Augmented Generation to ground AI analysis in actual document text"
- **Vector Search**: "pgvector enables semantic similarity search for intelligent evidence gathering"
- **Gemini API**: "Leveraging Gemini 2.5 Flash for fast, accurate claim extraction and evidence analysis"

### Environmental Impact

- **Transparency**: "Helps investors and consumers make informed decisions"
- **Accountability**: "Creates pressure for companies to back up their claims"
- **Education**: "Shows what makes a credible vs. questionable sustainability claim"

### User Experience

- **Simple Upload**: "Anyone can analyze a report in under 2 minutes"
- **Citation-Backed**: "Every rating has explainable evidence with page references"
- **Traffic-Light System**: "Intuitive red/amber/green makes results accessible to non-experts"

## Common Demo Pitfalls

### If Analysis Fails

- **Check Gemini API Key**: Ensure it's valid and has quota
- **Check PDF**: Some PDFs are images, not text (use OCR-enabled reports)
- **Check Logs**: `docker-compose logs python-api`

### If No Claims Found

- "This is actually a good sign - it means the document doesn't contain typical greenwashing language"
- "Try another report with more environmental claims"

### If Analysis Takes Too Long

- "Complex documents with many claims take longer"
- "In production, we'd implement async processing and email notifications"

## Advanced Demo Features

If you have extra time:

1. **Upload Multiple Documents**
   - Show the document list growing
   - Compare results across companies

2. **Show the API**
   - Navigate to http://localhost:8000/docs
   - Demo the interactive API documentation
   - Show the data models

3. **Database Inspection**
   ```bash
   docker-compose exec postgres psql -U greenwash -d greenwash_db
   \dt  # Show tables
   SELECT * FROM claim LIMIT 5;
   ```

## Cleanup

After demo:
```bash
docker-compose down
docker volume prune  # Optional: Remove database
```

## Sample Questions & Answers

**Q: How does it detect greenwashing?**
A: We extract claims, find evidence in the same document, and score based on specificity, verifiability, scope coverage, and offset dependency.

**Q: Can it verify claims against external sources?**
A: Currently it analyzes internal consistency. Future versions could integrate external databases.

**Q: What's the accuracy?**
A: Gemini 2.5 Flash achieves high precision in claim extraction with improved speed. Evidence analysis is explainable so users can judge for themselves.

**Q: How do you handle different report formats?**
A: We use multiple PDF parsers (pdfplumber, PyMuPDF, OCR fallback) to handle various formats.

**Q: Is this production-ready?**
A: This is a hackathon MVP. Production would need: rate limiting, caching, async processing, and user authentication.

## Backup Plan

If Docker issues arise:

1. **Run Backend Only**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **Show Screenshots/Video**
   - Prepare screenshots of key features
   - Record a video walkthrough beforehand

3. **Demo the Code**
   - Walk through architecture
   - Show claim extraction prompt
   - Explain scoring algorithm

## Success Metrics

A good demo shows:
- ✅ Document upload works smoothly
- ✅ Analysis completes successfully
- ✅ Results display with clear ratings
- ✅ Evidence citations are visible
- ✅ UI is responsive and professional

Good luck! 🌱

