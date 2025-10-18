# 🌱 Greenwash Detector - User Guide

## ✅ System Status: FULLY OPERATIONAL

Your Greenwash Detector is now working end-to-end!

## 🚀 How to Use

### Step 1: Access the Application
Open your browser and go to: **http://localhost:3000**

### Step 2: Upload a Document
1. You'll see a green upload zone on the homepage
2. **Drag and drop** a PDF sustainability report OR **click to browse**
3. The document will upload (takes 1-2 minutes for large PDFs to process embeddings)
4. You'll see the document appear in the documents list

### Step 3: View Your Document
1. Click on the uploaded document card
2. You'll be taken to the document detail page
3. You'll see the document title and an **"Analyze Document"** button

### Step 4: Analyze for Greenwashing
1. Click the **"Analyze Document"** button
2. You'll see a progress indicator: "Analyzing Document... This may take 1-2 minutes"
3. The AI is now:
   - 📝 Extracting environmental claims
   - 🔍 Finding supporting/contradicting evidence
   - ⚖️ Calculating scores across 4 dimensions
   - 🚦 Assigning traffic-light ratings (Red/Amber/Green)

### Step 5: Review the Results
After analysis completes, you'll see:

#### **Analysis Results Header**
- Number of claims found
- Overall summary

#### **Individual Claim Cards**
Each claim displays:

**🟢 Green Rating** = Low greenwashing risk (score ≥70)
- Strong supporting evidence
- Verifiable claims with specific targets
- Comprehensive scope coverage

**🟡 Amber Rating** = Medium risk (score 40-69)
- Some evidence but insufficient details
- Claims lack specifics or verification
- Partial scope coverage

**🔴 Red Rating** = High greenwashing risk (score <40)
- Contradicting evidence
- Vague or unverifiable claims
- No evidence provided

#### **Click to Expand Each Claim**
When you click a claim card, you'll see:

1. **Dimension Scores** (0-100 for each):
   - **Integrity**: Does evidence support the claim?
   - **Verifiability**: Are there specific, measurable targets?
   - **Scope Coverage**: Does it cover Scope 1, 2, and 3 emissions?
   - **Offset Dependency**: Is it real reduction or just offsetting?

2. **Evidence Analysis**:
   - **Stance**: supports / contradicts / insufficient
   - **Strength**: 0-3 confidence rating
   - **Rationale**: AI explanation of its assessment
   - **Citations**: Page numbers and text snippets from the original document

## 📊 Current Test Document

The **2024 Amazon Sustainability Report** has already been analyzed with these results:

### Sample Findings:

**🟢 Green Rating Example:**
- **Claim**: "Net-zero carbon emissions across global operations by 2040"
- **Score**: 86.2/100
- **Why Green**: 
  - Strong supporting evidence with exact quotes
  - Clear target year (2040)
  - Covers all 3 scopes (S1, S2, S3)
  - Focuses on direct reductions

**🟡 Amber Rating Example:**
- **Claim**: "85% waste diverted from landfill in 2024"
- **Score**: 55.0/100
- **Why Amber**: 
  - Some conflicting information in passages
  - Lacks clear methodology explanation
  - No emission scope specified

## 🎯 What to Look For

### Signs of Genuine Sustainability (Green):
- ✅ Specific numeric targets with dates
- ✅ Baseline year mentioned
- ✅ Covers Scope 1, 2, AND 3 emissions
- ✅ Details on methodology
- ✅ Multiple citations supporting the claim
- ✅ Focus on direct reductions, not just offsets

### Red Flags for Greenwashing (Red/Amber):
- ⚠️ Vague language ("committed to sustainability")
- ⚠️ No specific targets or timelines
- ⚠️ Only mentions Scope 1 & 2 (ignoring Scope 3)
- ⚠️ Heavy reliance on carbon offsets
- ⚠️ No supporting evidence in the document
- ⚠️ Contradicting information found

## 🔧 Troubleshooting

### "Analysis Failed" Error
**Solution**: The document was likely corrupted during a previous failed upload. The system now automatically:
1. Checks for existing analysis results
2. Shows them if available
3. Otherwise offers to re-analyze

### Upload Shows Error but Document Appears
**Why**: Large documents take time to process embeddings. The frontend may timeout, but the backend continues processing. **Just refresh the page** and the document will be there!

### Analysis Takes Too Long
**Normal**: Analysis of large reports (50+ pages) can take 2-3 minutes because:
- Each claim requires an AI call to Gemini
- Evidence analysis uses RAG to search 100s of passages
- Multiple scoring dimensions are calculated
- This is NORMAL for thorough analysis!

## 📈 Understanding the Scoring System

### Integrity Score (0-100)
- Based on evidence stance and strength
- 99-100: Very strong supporting evidence
- 40-70: Insufficient or weak evidence  
- 0-40: Contradicting evidence

### Verifiability Score (0-100)
- +15 points: Has numeric value
- +15 points: Has target year
- +10 points: Has baseline year
- +10 points: Defines emission scopes

### Scope Coverage Score (0-100)
- 90 points: Covers Scope 3 (most comprehensive)
- 50 points: Only Scope 1 & 2
- 30 points: No scope specified

### Offset Dependency Score (0-100)
- Higher = Less reliance on carbon offsets
- Lower = Heavy use of offsets without direct reductions

## 🎨 Visual Indicators

- **🟢 Green Badge**: Trustworthy claim (≥70)
- **🟡 Amber Badge**: Needs verification (40-69)
- **🔴 Red Badge**: Likely greenwashing (<40)
- **Supports Badge**: Evidence backs up the claim
- **Contradicts Badge**: Evidence disputes the claim
- **Insufficient Badge**: Not enough evidence to judge

## 💡 Tips for Best Results

1. **Use Official Reports**: Annual sustainability reports work best
2. **Check Citations**: Always read the original passages cited
3. **Compare Claims**: Look for patterns across multiple claims
4. **Context Matters**: Consider industry standards and baselines
5. **Question Vague Language**: If it sounds too good to be true, expand the claim to see the evidence

## 🔄 Refresh to See Results

If you just analyzed a document:
1. **Refresh your browser** (Cmd+R or F5)
2. **Click on the document again**
3. **The analysis results will now appear automatically**

The results are saved in the database, so you can come back anytime to review them!

## 🌟 What Makes This Tool Unique

- **AI-Powered**: Uses Google's Gemini 2.5 Flash for deep analysis
- **RAG Technology**: Retrieves actual evidence from the document
- **Multi-Dimensional Scoring**: Not just a single "greenwash score"
- **Citation-Backed**: Every assessment includes original text quotes
- **Comprehensive**: Analyzes Scope 1, 2, AND 3 emissions
- **Transparent**: Shows you WHY each rating was assigned

## 📞 Need Help?

If something isn't working:
1. Check that all Docker containers are running: `docker-compose ps`
2. Check backend logs: `docker-compose logs python-api --tail 50`
3. Check frontend logs: `docker-compose logs nextjs --tail 50`
4. Restart everything: `docker-compose restart`

---

**Enjoy detecting greenwashing! 🌱🔍**

