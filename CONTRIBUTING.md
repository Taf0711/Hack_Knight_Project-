# Contributing to Greenwash Detector

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Hack_Knight_project.git
   cd Hack_Knight_project
   ```
3. **Set up the development environment:**
   ```bash
   make setup
   # Add your GEMINI_API_KEY to .env
   make start
   ```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### 2. Make Your Changes

**Backend (Python):**
```bash
cd backend
pip install -r requirements.txt
# Make changes
python -m pytest  # Run tests
```

**Frontend (TypeScript/React):**
```bash
cd frontend
npm install
# Make changes
npm run lint  # Check linting
npm test      # Run tests
```

### 3. Test Your Changes

**Run full stack:**
```bash
make start
# Test at http://localhost:3000
```

**Run tests:**
```bash
make test
```

### 4. Commit Your Changes

We use conventional commits:

```bash
git commit -m "feat: add PDF preview component"
git commit -m "fix: resolve embedding generation error"
git commit -m "docs: update API documentation"
```

**Commit types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style/formatting
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Build/tooling changes

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style Guidelines

### Python (Backend)

**Follow PEP 8:**
```python
# Good
def process_document(file_path: str) -> Dict:
    """Process a PDF document."""
    result = pdf_processor.process(file_path)
    return result

# Bad
def processDocument(filepath):
    result=pdf_processor.process(filepath)
    return result
```

**Use type hints:**
```python
from typing import List, Dict, Optional

def get_claims(document_id: str) -> List[Dict]:
    ...
```

**Use docstrings:**
```python
def analyze_claim(claim_text: str, context: str) -> Dict:
    """
    Analyze a claim for greenwashing indicators.
    
    Args:
        claim_text: The environmental claim to analyze
        context: Supporting context from the document
        
    Returns:
        Analysis results with stance and rationale
    """
    ...
```

### TypeScript/React (Frontend)

**Use TypeScript:**
```typescript
// Good
interface ClaimProps {
  claim: Claim;
  onExpand: (id: string) => void;
}

export function ClaimCard({ claim, onExpand }: ClaimProps) {
  ...
}

// Bad
export function ClaimCard({ claim, onExpand }) {
  ...
}
```

**Use functional components with hooks:**
```typescript
export function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null);
  
  return <div>...</div>;
}
```

**Follow naming conventions:**
- Components: PascalCase (`DocumentUpload.tsx`)
- Hooks: camelCase starting with 'use' (`useDocuments.ts`)
- Utils: camelCase (`formatDate.ts`)

## Pull Request Guidelines

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code follows style guidelines
- [ ] Tests pass (`make test`)
- [ ] New features include tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] No console.log or debugging code
- [ ] Code is formatted properly

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
Describe how you tested the changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes
```

## Testing Guidelines

### Backend Tests

**Location:** `backend/tests/`

**Example:**
```python
import pytest
from services.scorer import ClaimScorer

def test_integrity_scoring():
    scorer = ClaimScorer()
    claim = {"claim_text": "Net zero by 2030"}
    evidence = [{"stance": "supports", "strength": 3}]
    
    scores, rating = scorer.score_claim(claim, evidence)
    
    assert rating in ["red", "amber", "green"]
    assert len(scores) == 4
```

**Run tests:**
```bash
cd backend
pytest
pytest -v  # Verbose
pytest tests/test_scorer.py  # Specific file
```

### Frontend Tests

**Location:** `frontend/__tests__/`

**Example:**
```typescript
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders with correct variant', () => {
    render(<Badge variant="green">Test</Badge>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

**Run tests:**
```bash
cd frontend
npm test
npm test -- --coverage  # With coverage
```

## Documentation

### Code Documentation

**Python:**
- Use docstrings for all public functions/classes
- Include type hints
- Add inline comments for complex logic

**TypeScript:**
- Use JSDoc for complex functions
- Add prop types for all components
- Document API interfaces

### User Documentation

Update relevant documentation:
- `README.md` - Main documentation
- `ARCHITECTURE.md` - Technical architecture
- `DEMO.md` - Demo guide
- API docs in code (auto-generated by FastAPI)

## Feature Development Guide

### Adding a New API Endpoint

1. **Define the endpoint in `backend/main.py`:**
```python
@app.get("/api/new-endpoint")
async def new_endpoint(session: Session = Depends(get_session)):
    # Implementation
    return {"result": "data"}
```

2. **Add types to `frontend/lib/api.ts`:**
```typescript
export interface NewData {
  result: string;
}

export const getNewData = async () => {
  const response = await api.get<NewData>('/new-endpoint');
  return response.data;
};
```

3. **Use in component:**
```typescript
const { data } = useQuery({
  queryKey: ['newData'],
  queryFn: getNewData,
});
```

### Adding a New Component

1. **Create component file:**
```typescript
// frontend/components/NewComponent.tsx
import { ComponentProps } from './types';

export function NewComponent({ prop }: ComponentProps) {
  return <div>...</div>;
}
```

2. **Add tests:**
```typescript
// frontend/__tests__/NewComponent.test.tsx
describe('NewComponent', () => {
  it('renders correctly', () => {
    // Test implementation
  });
});
```

3. **Export from index (if needed):**
```typescript
// frontend/components/index.ts
export { NewComponent } from './NewComponent';
```

## Issue Reporting

### Bug Reports

Include:
1. Description of the bug
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Environment (OS, browser, versions)
6. Screenshots/logs if applicable

**Template:**
```markdown
**Bug Description:**
Clear description of the bug

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- OS: macOS 14.0
- Browser: Chrome 120
- Docker: 24.0.0

**Screenshots/Logs:**
[Attach if applicable]
```

### Feature Requests

Include:
1. Description of the feature
2. Use case / problem it solves
3. Proposed solution (if any)
4. Alternative solutions considered

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Keep discussions on-topic
- Report inappropriate behavior

### Getting Help

- **Issues:** Check existing issues first
- **Discussions:** Use GitHub Discussions for questions
- **Documentation:** Read docs before asking
- **Code:** Check examples in codebase

## Release Process

(For maintainers)

1. Update version in `package.json` and `pyproject.toml`
2. Update CHANGELOG.md
3. Create release branch: `release/v1.x.x`
4. Test thoroughly
5. Merge to main
6. Tag release: `git tag v1.x.x`
7. Push tags: `git push --tags`
8. Create GitHub Release with notes

## Questions?

Feel free to:
- Open an issue for bugs
- Start a discussion for questions
- Reach out to maintainers

Thank you for contributing! 🌱

