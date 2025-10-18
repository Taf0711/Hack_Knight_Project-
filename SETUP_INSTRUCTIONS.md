# Greenwash Detector - Quick Setup Guide

## Prerequisites

- Docker & Docker Compose
- Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

## Step-by-Step Setup

### 1. Get Your Gemini API Key

1. Visit https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 2. Configure Environment

```bash
cd /Users/tafseerhaque/Documents/Hack_Knight_project

# Edit the .env file
nano .env

# Replace this line:
GEMINI_API_KEY=your_gemini_api_key_here

# With your actual key:
GEMINI_API_KEY=AIzaSy...your_actual_key_here
```

### 3. Start the Application

```bash
# Option 1: Using Make
make start

# Option 2: Using Docker Compose directly
docker-compose up --build

# To run in background:
docker-compose up --build -d
```

### 4. Access the Application

Once all services are running:

- **Frontend (Main App)**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## First Time Usage

1. **Upload a PDF**: 
   - Go to http://localhost:3000
   - Drag and drop a sustainability report PDF
   - Wait for processing (10-30 seconds)

2. **Analyze the Document**:
   - Click on the uploaded document
   - Click "Analyze Document"
   - Wait for AI analysis (1-2 minutes)

3. **Review Results**:
   - See traffic-light ratings (🔴🟡🟢)
   - Expand claims to see evidence
   - Review dimension scores

## Troubleshooting

### "Services not starting"
```bash
# Check if ports are available
lsof -i :3000
lsof -i :8000
lsof -i :5432

# Stop any conflicting services
docker-compose down
```

### "Gemini API Error"
- Verify API key is correct in `.env`
- Check you have API access enabled
- Ensure no rate limiting (60 req/min)

### "Database Connection Failed"
```bash
# Restart just the database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### "Frontend can't reach backend"
```bash
# Check all services are running
docker-compose ps

# Restart all services
docker-compose restart
```

## Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f python-api
docker-compose logs -f nextjs
docker-compose logs -f postgres
```

## Stopping the Application

```bash
# Stop services
docker-compose down

# Stop and remove volumes (full cleanup)
docker-compose down -v
```

## Development Mode

### Backend Only
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Only
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables Reference

### Main `.env` file:
```bash
DATABASE_URL=postgresql://greenwash:greenwash123@localhost:5432/greenwash_db
GEMINI_API_KEY=your_key_here
PYTHON_API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:3000
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=52428800
```

### Frontend `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
PYTHON_API_URL=http://localhost:8000
```

## What's Next?

- Try uploading different sustainability reports
- Explore the API documentation at http://localhost:8000/docs
- Check `DEMO.md` for demo tips
- Read `ARCHITECTURE.md` for technical details

## Support

- Check `README.md` for full documentation
- Review `IMPLEMENTATION_NOTES.md` for technical details
- Open an issue if you encounter problems

Happy greenwashing detection! 🌱
