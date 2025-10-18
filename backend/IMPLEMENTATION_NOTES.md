# Gemini API Implementation Notes

## Current Implementation

The project uses the official Google Genai SDK (`google-genai`) with proper structured types.

### Key Components

#### 1. Client Initialization
```python
from google import genai
from google.genai import types

client = genai.Client(api_key=GEMINI_API_KEY)
```

#### 2. Structured Content
All requests use typed `Content` and `Part` objects:
```python
contents = [
    types.Content(
        role="user",
        parts=[types.Part.from_text(text=prompt)]
    )
]
```

#### 3. Generation Configuration

**Claim Extraction** (`claim_extractor.py`):
- Model: `gemini-2.5-flash`
- Temperature: 0.1 (low for consistent JSON output)
- Max tokens: 8192
- Purpose: Extract structured claims as JSON

**Evidence Analysis** (`evidence_analyzer.py`):
- Model: `gemini-2.5-flash`
- Temperature: 0.2 (slightly higher for nuanced reasoning)
- Max tokens: 4096
- **Thinking config**: `thinking_budget=-1` (extended thinking enabled)
- Purpose: Deep analysis of claims vs. evidence

**Embeddings** (`embeddings.py`):
- Model: `text-embedding-004`
- Generates 768-dimensional vectors
- Used for semantic similarity search

## Model Selection

### gemini-2.5-flash
- Latest Gemini model
- Fast inference
- Excellent for structured output
- Supports thinking mode for complex reasoning

### text-embedding-004
- Standard embedding model
- 768 dimensions
- Good for semantic search with pgvector

## Advanced Features

### Thinking Config
Used in `evidence_analyzer.py` for deeper analysis:
```python
thinking_config=types.ThinkingConfig(
    thinking_budget=-1,  # Unlimited thinking time
)
```

This enables the model to:
- Reason more thoroughly about contradictions
- Consider multiple perspectives
- Provide more nuanced assessments

### Streaming (Optional)
See `streaming_example.py` for real-time response streaming.
Can be integrated for progressive UI updates.

## Configuration Parameters

### Temperature
- **0.1**: Claim extraction (needs consistency)
- **0.2**: Evidence analysis (needs some creativity)

### Top-P / Top-K
- **top_p=0.95**: Standard nucleus sampling
- **top_k=40**: Limits vocabulary per step

### Max Output Tokens
- **8192**: Claim extraction (handles long documents)
- **4096**: Evidence analysis (focused responses)

## Error Handling

All services include:
- Try-catch blocks around API calls
- Structured logging with `structlog`
- Fallback responses for analysis failures
- Graceful degradation

## Rate Limiting

Gemini API limits (as of implementation):
- 60 requests per minute (standard tier)
- Consider implementing:
  - Request queuing
  - Exponential backoff
  - Response caching

## Future Enhancements

1. **Streaming Integration**
   - Add WebSocket support to frontend
   - Stream analysis results in real-time
   - Better UX for long documents

2. **Batch Processing**
   - Process multiple claims in parallel
   - Optimize API usage
   - Reduce total analysis time

3. **Response Caching**
   - Cache claim extractions by document hash
   - Cache evidence analysis by claim+context hash
   - Reduce redundant API calls

4. **Multi-Modal Support**
   - Add image analysis for charts/graphs
   - Extract data from visual elements
   - Enhance evidence gathering

## Testing

To test the implementation:

```bash
cd backend
python -m pytest tests/
```

Or test individual services:
```python
from services.claim_extractor import ClaimExtractor

extractor = ClaimExtractor()
claims = extractor.extract_claims("Sample sustainability text...")
print(claims)
```

## Debugging

Enable debug logging:
```python
import structlog
structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG)
)
```

## References

- [Google Genai SDK Docs](https://googleapis.github.io/python-genai/)
- [Gemini API Reference](https://ai.google.dev/api)
- [Best Practices for Prompting](https://ai.google.dev/docs/prompting-intro)

