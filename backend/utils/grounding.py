"""
Citation verification and grounding utilities
"""
from typing import List, Dict
from difflib import SequenceMatcher
import re
import structlog

logger = structlog.get_logger()


def fuzzy_match(text1: str, text2: str) -> float:
    """
    Calculate similarity between two strings using fuzzy matching
    Returns similarity score between 0 and 1
    """
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()


def verify_citation(citation_text: str, source_passages: List[str], threshold: float = 0.90) -> Dict:
    """
    Verify that a citation actually appears in the source document
    
    Args:
        citation_text: The cited text to verify
        source_passages: List of passage texts from the source document
        threshold: Minimum similarity score (default 0.90 for 90% match)
    
    Returns:
        Dict with verification results: {verified, best_match, similarity, passage_index}
    """
    if not citation_text or not source_passages:
        return {
            "verified": False,
            "reason": "Empty citation or no source passages",
            "similarity": 0.0
        }
    
    # Clean citation text
    citation_clean = re.sub(r'\s+', ' ', citation_text.strip())
    
    best_similarity = 0.0
    best_match = None
    best_passage_idx = -1
    
    # Check each passage for the citation
    for idx, passage in enumerate(source_passages):
        passage_clean = re.sub(r'\s+', ' ', passage.strip())
        
        # Try direct substring match first (fast path)
        if citation_clean.lower() in passage_clean.lower():
            return {
                "verified": True,
                "best_match": citation_clean,
                "similarity": 1.0,
                "passage_index": idx,
                "method": "exact_substring"
            }
        
        # Try fuzzy matching
        similarity = fuzzy_match(citation_clean, passage_clean)
        
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = passage_clean[:len(citation_clean) + 50]  # Show context
            best_passage_idx = idx
    
    # Check if similarity meets threshold
    verified = best_similarity >= threshold
    
    result = {
        "verified": verified,
        "best_match": best_match,
        "similarity": best_similarity,
        "passage_index": best_passage_idx,
        "method": "fuzzy_match"
    }
    
    if not verified:
        result["reason"] = f"No match above threshold {threshold} (best: {best_similarity:.2f})"
    
    return result


def validate_citations(citations: List[Dict], all_passages: List[Dict]) -> List[Dict]:
    """
    Validate multiple citations against source passages
    
    Args:
        citations: List of citation dicts with 'snippet' field
        all_passages: List of passage dicts with 'text' field
    
    Returns:
        List of citations with added 'validation' field
    """
    passage_texts = [p.get("text", "") for p in all_passages]
    
    validated_citations = []
    for citation in citations:
        snippet = citation.get("snippet", "")
        
        # Verify the citation
        verification = verify_citation(snippet, passage_texts)
        
        # Add verification results to citation
        validated_citation = citation.copy()
        validated_citation["validation"] = verification
        validated_citations.append(validated_citation)
        
        # Log warnings for unverified citations
        if not verification["verified"]:
            logger.warning(
                "Unverified citation detected",
                snippet=snippet[:100],
                reason=verification.get("reason"),
                similarity=verification.get("similarity")
            )
    
    return validated_citations


def extract_keywords(text: str, min_length: int = 3) -> List[str]:
    """
    Extract important keywords from text for hybrid search
    
    Args:
        text: Input text
        min_length: Minimum keyword length
    
    Returns:
        List of keywords
    """
    # Remove common stopwords
    stopwords = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
        'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'our', 'we'
    }
    
    # Extract words
    words = re.findall(r'\b\w+\b', text.lower())
    
    # Filter keywords
    keywords = [
        word for word in words
        if len(word) >= min_length and word not in stopwords
    ]
    
    # Also extract numbers and percentages
    numbers = re.findall(r'\d+(?:\.\d+)?%?', text)
    keywords.extend(numbers)
    
    # Extract years (2000-2100)
    years = re.findall(r'\b20\d{2}\b', text)
    keywords.extend(years)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_keywords = []
    for kw in keywords:
        if kw not in seen:
            seen.add(kw)
            unique_keywords.append(kw)
    
    return unique_keywords[:20]  # Limit to top 20 keywords


def calculate_keyword_overlap(text: str, keywords: List[str]) -> float:
    """
    Calculate what fraction of keywords appear in the text
    
    Args:
        text: Text to search in
        keywords: List of keywords
    
    Returns:
        Score between 0 and 1
    """
    if not keywords:
        return 0.0
    
    text_lower = text.lower()
    matches = sum(1 for kw in keywords if kw.lower() in text_lower)
    
    return matches / len(keywords)

