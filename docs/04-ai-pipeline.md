# AI Pipeline — M2 Design (LangGraph + CrewAI)

> **Status: Planned for Milestone 2.** Not yet implemented. This document captures the complete design so implementation can begin without re-designing.

---

## 1. Overview

When a candidate uploads a resume, an async AI pipeline:
1. **Parses** the PDF/DOCX into structured data
2. **Embeds** the full resume text into a 1536-dimension vector
3. **Detects duplicates** against existing candidates
4. **Writes** structured data back to the database

The pipeline runs in a **Supabase Edge Function** triggered by a database webhook on `resume_uploads` status change to `'uploaded'`.

```
Supabase DB Webhook
(status = 'uploaded')
       │
       ▼
Edge Function: process-resume
       │
       ├── Download file from Storage
       │
       ├── LangGraph Workflow
       │       ├── Node: parse_pdf        (PyMuPDF)
       │       ├── Node: extract_structure (GPT-4o-mini)
       │       ├── Node: embed_text        (text-embedding-3-small)
       │       ├── Node: detect_duplicate  (pgvector cosine similarity)
       │       └── Node: write_to_db       (upsert skills/experience/education)
       │
       └── UPDATE resume_uploads SET status = 'processed' | 'failed'
```

---

## 2. LangGraph Workflow

LangGraph manages state across pipeline nodes. Each node is a Python function.

### State Schema

```python
from typing import TypedDict, Optional
from dataclasses import dataclass

class PipelineState(TypedDict):
    # Input
    upload_id: str
    user_id: str
    storage_path: str

    # Intermediate
    raw_text: Optional[str]
    page_count: Optional[int]
    structured_data: Optional[dict]
    embedding: Optional[list[float]]

    # Output
    duplicate_of: Optional[str]   # upload_id of similar existing resume
    similarity_score: Optional[float]
    error: Optional[str]
    status: str   # 'processing' | 'processed' | 'failed' | 'duplicate'
```

### Graph Definition

```python
from langgraph.graph import StateGraph, END

workflow = StateGraph(PipelineState)

workflow.add_node("download",          download_from_storage)
workflow.add_node("parse_pdf",         parse_pdf_node)
workflow.add_node("extract_structure", extract_structure_node)
workflow.add_node("embed_text",        embed_text_node)
workflow.add_node("detect_duplicate",  detect_duplicate_node)
workflow.add_node("write_to_db",       write_to_db_node)
workflow.add_node("handle_error",      handle_error_node)

workflow.set_entry_point("download")
workflow.add_edge("download",          "parse_pdf")
workflow.add_edge("parse_pdf",         "extract_structure")
workflow.add_edge("extract_structure", "embed_text")
workflow.add_edge("embed_text",        "detect_duplicate")
workflow.add_conditional_edges(
    "detect_duplicate",
    lambda s: "duplicate" if s["similarity_score"] > 0.95 else "write",
    {"duplicate": "handle_duplicate", "write": "write_to_db"}
)
workflow.add_edge("write_to_db", END)

app = workflow.compile()
```

### Node Implementations

#### `parse_pdf_node`
```python
import fitz  # PyMuPDF

def parse_pdf_node(state: PipelineState) -> dict:
    file_bytes = state["file_bytes"]
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    return {
        "raw_text": text,
        "page_count": len(doc)
    }
```

#### `extract_structure_node`
```python
from openai import AsyncOpenAI

EXTRACTION_PROMPT = """
Extract structured information from this resume. Return JSON with:
{
  "full_name": str,
  "headline": str,
  "summary": str,
  "city": str,
  "skills": [{"name": str, "proficiency": "beginner|intermediate|advanced|expert"}],
  "experiences": [{"company": str, "role": str, "start": "YYYY-MM", "end": "YYYY-MM|present",
                   "description": str, "tech_stack": [str]}],
  "educations": [{"institution": str, "degree": str, "field": str, "start_year": int, "end_year": int}],
  "linkedin_url": str | null,
  "github_url": str | null
}
"""

async def extract_structure_node(state: PipelineState) -> dict:
    client = AsyncOpenAI()
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": state["raw_text"][:12000]}  # ~3000 tokens
        ]
    )
    return {"structured_data": json.loads(response.choices[0].message.content)}
```

#### `embed_text_node`
```python
async def embed_text_node(state: PipelineState) -> dict:
    client = AsyncOpenAI()
    # Combine key fields for a dense, meaningful embedding
    embed_text = f"""
    {state['structured_data'].get('full_name', '')}
    {state['structured_data'].get('headline', '')}
    {state['structured_data'].get('summary', '')}
    Skills: {', '.join(s['name'] for s in state['structured_data'].get('skills', []))}
    {state['raw_text'][:4000]}
    """.strip()

    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=embed_text
    )
    return {"embedding": response.data[0].embedding}  # float[1536]
```

#### `detect_duplicate_node`
```python
async def detect_duplicate_node(state: PipelineState) -> dict:
    # pgvector cosine similarity: 1.0 = identical
    result = await db.execute("""
        SELECT upload_id, 1 - (embedding <=> $1::vector) AS similarity
        FROM resume_embeddings
        WHERE user_id != $2
        ORDER BY embedding <=> $1::vector
        LIMIT 1
    """, [state["embedding"], state["user_id"]])

    if result and result[0]["similarity"] > 0.95:
        return {
            "duplicate_of": result[0]["upload_id"],
            "similarity_score": result[0]["similarity"]
        }
    return {"similarity_score": 0.0}
```

---

## 3. CrewAI Agents (M2 Extended)

CrewAI orchestrates multiple specialized agents for higher-quality extraction. Used as an alternative to the single-LLM extraction approach when higher accuracy is needed.

### Agent Definitions

```python
from crewai import Agent, Task, Crew

skills_agent = Agent(
    role="Skills Extractor",
    goal="Extract all technical and soft skills from resumes with proficiency levels",
    backstory="""You are an expert at identifying technical skills, tools, frameworks,
    and soft skills from resumes. You understand Indian tech industry context.""",
    llm="gpt-4o-mini",
    verbose=False
)

experience_agent = Agent(
    role="Experience Parser",
    goal="Extract work experience with accurate dates, roles, and tech stacks",
    backstory="""You specialize in parsing work experience sections, handling
    gaps, contract roles, and startup-to-enterprise transitions common in
    Indian engineering careers.""",
    llm="gpt-4o-mini"
)

profile_agent = Agent(
    role="Profile Summarizer",
    goal="Generate a compelling 2-sentence professional headline and summary",
    backstory="""You write concise, accurate professional summaries for
    software engineers based in India.""",
    llm="gpt-4o-mini"
)

# Tasks
extract_skills_task = Task(
    description="Extract all skills from: {resume_text}",
    agent=skills_agent,
    expected_output="JSON array of skills with name and proficiency"
)

extract_experience_task = Task(
    description="Extract work history from: {resume_text}",
    agent=experience_agent,
    expected_output="JSON array of experiences with company, role, dates, tech_stack"
)

# Crew
resume_crew = Crew(
    agents=[skills_agent, experience_agent, profile_agent],
    tasks=[extract_skills_task, extract_experience_task],
    verbose=False,
    process="sequential"
)
```

### When to use CrewAI vs direct LLM call

| Scenario | Approach |
|----------|----------|
| Standard resumes (< 3 pages) | Direct GPT-4o-mini call (faster, cheaper) |
| Complex resumes (10+ jobs, mixed languages) | CrewAI multi-agent (better accuracy) |
| Bulk reprocessing | LangGraph batch mode |

---

## 4. Database Tables for M2

```sql
-- Vector embeddings (add pgvector extension first)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE resume_embeddings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id   uuid NOT NULL REFERENCES resume_uploads(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  embedding   vector(1536) NOT NULL,
  model       text NOT NULL DEFAULT 'text-embedding-3-small',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_resume_embeddings_hnsw
  ON resume_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Duplicate detection results
CREATE TABLE duplicate_detections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id           uuid NOT NULL REFERENCES resume_uploads(id),
  similar_upload_id   uuid NOT NULL REFERENCES resume_uploads(id),
  similarity_score    numeric(5,4) NOT NULL,
  reviewed            boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Candidate metadata (denormalized for fast search)
CREATE TABLE candidate_metadata (
  user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_exp_years     numeric(4,1),
  current_title       text,
  primary_skills      text[],
  industries          text[],
  education_level     text,  -- 'high_school', 'bachelors', 'masters', 'phd'
  last_updated        timestamptz NOT NULL DEFAULT now()
);
```

---

## 5. Cost Estimates (per resume)

| Operation | Model | Cost |
|-----------|-------|------|
| Text extraction | PyMuPDF (free) | $0.00 |
| Structure extraction | GPT-4o-mini (~800 tokens in, ~300 out) | ~$0.0003 |
| Embedding | text-embedding-3-small (1536 dims, ~500 tokens) | ~$0.00002 |
| **Total per resume** | | **~$0.0004** |
| **100,000 resumes** | | **~$40** |

---

## 6. Error Handling & Retries

```python
# Status transitions
pending → processing → processed ✓
pending → processing → failed (retried up to 3x)
processing → failed (permanent after 3 attempts)

# Retry logic
if upload.processing_attempts < 3:
    # re-queue after exponential backoff: 30s, 2m, 10m
    retry_after = 30 * (2 ** upload.processing_attempts)
else:
    UPDATE resume_uploads SET status = 'failed',
           error_message = 'Max retries exceeded'
```

---

## 7. Edge Function Trigger Setup

```sql
-- Supabase DB webhook (configure in Supabase dashboard)
-- Fires when resume_uploads.status changes to 'uploaded'
-- HTTP POST to: {supabase_url}/functions/v1/process-resume
-- Headers: Authorization: Bearer {service_role_key}
-- Body: { "record": { ...resume_uploads row... } }
```
