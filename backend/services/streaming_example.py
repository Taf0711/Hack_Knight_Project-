"""
Example of using Gemini streaming for real-time responses
This is a reference implementation - not currently used in the main pipeline
but can be integrated for real-time claim analysis display
"""

from typing import Generator
from google import genai
from google.genai import types
import os
from config import GEMINI_API_KEY


def stream_claim_analysis(claim_text: str, context: str) -> Generator[str, None, None]:
    """
    Stream claim analysis in real-time
    Useful for providing progressive updates to users
    
    Args:
        claim_text: The environmental claim to analyze
        context: Supporting context from the document
        
    Yields:
        Chunks of analysis text as they're generated
    """
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    model = "gemini-2.5-flash"
    
    prompt = f"""Analyze this environmental claim for potential greenwashing:

Claim: {claim_text}

Context from document:
{context}

Provide a detailed analysis covering:
1. Evidence support level
2. Specificity and verifiability
3. Potential red flags
4. Overall credibility assessment
"""
    
    # Create structured content
    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)]
        )
    ]
    
    # Configure with thinking for deeper analysis
    generate_config = types.GenerateContentConfig(
        temperature=0.2,
        top_p=0.95,
        max_output_tokens=4096,
        thinking_config=types.ThinkingConfig(
            thinking_budget=-1,  # Extended thinking for complex analysis
        )
    )
    
    # Stream the response
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_config,
    ):
        if chunk.text:
            yield chunk.text


def example_usage():
    """Example of how to use the streaming function"""
    claim = "We will achieve net-zero emissions by 2030"
    context = "Our company plans to purchase carbon offsets..."
    
    print("Streaming analysis:")
    for text_chunk in stream_claim_analysis(claim, context):
        print(text_chunk, end="", flush=True)
    print("\n\nAnalysis complete!")


if __name__ == "__main__":
    example_usage()

