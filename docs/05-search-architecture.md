# Search Architecture — RAG + pgvector + Hybrid Search (M3)

> **Status: Planned for Milestone 3.** Requires M2 (embeddings) to be complete first.

---

## 1. Overview

Admin search accepts a natural language query like:
> "React engineers in Bangalore with 5+ years, open to work, from IIT or NIT"

The system returns ranked candidates using **hybrid search**: combining vector similarity (semantic meaning), full-text search (keywords), and metadata filters (city, availability, salary, experience).

---

## 2. Search Architecture

```
Admin types query
       │
       ▼
┌──────────────────────────────┐
│   Query Processing Layer     │
│   (Next.js Route Handler)    │
│                              │
│  1. Embed query text         │──▶ OpenAI text-embedding-3-small
│  2. Extract metadata filters │──▶ GPT-4o-mini (optional)
│  3. Build hybrid query       │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│   Supabase PostgreSQL        │
│                              │
│  ┌────────────────────────┐  │
│  │ Vector Search          │  │
│  │ pgvector ANN (HNSW)    │  │──▶ top-100 by cosine similarity
│  │ <=> operator           │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Full-Text Search       │  │──▶ top-100 by BM25/FTS rank
│  │ to_tsvector('english') │  │
│  │ plainto_tsquery()      │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Metadata Filters       │  │──▶ applied as WHERE clauses
│  │ city, availability,    │  │
│  │ salary, skills, etc.   │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ RRF Fusion             │  │──▶ Reciprocal Rank Fusion
│  │ rank = 1/(k + rank_v)  │  │   combines vector + FTS ranks
│  │      + 1/(k + rank_fts)│  │
│  └────────────────────────┘  │
└──────────────────────────────┘
             │
             ▼
     Ranked candidate list
     (top 20, paginated)
```

---

## 3. Hybrid Search SQL Function

```sql
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text        text,
  query_embedding   vector(1536),
  city_filter       text    DEFAULT NULL,
  availability      text[]  DEFAULT NULL,
  min_exp_years     numeric DEFAULT NULL,
  salary_min        integer DEFAULT NULL,
  salary_max        integer DEFAULT NULL,
  skill_filter      text[]  DEFAULT NULL,
  result_limit      integer DEFAULT 20,
  rrf_k             integer DEFAULT 60
)
RETURNS TABLE (
  user_id         uuid,
  full_name       text,
  headline        text,
  city            text,
  availability_status text,
  completion_pct  integer,
  total_exp_years numeric,
  primary_skills  text[],
  rrf_score       float,
  vector_rank     integer,
  fts_rank        integer,
  similarity      float
) AS $$
WITH

-- Vector search: top 100 by embedding similarity
vector_results AS (
  SELECT
    re.user_id,
    ROW_NUMBER() OVER (ORDER BY re.embedding <=> query_embedding) AS rank,
    1 - (re.embedding <=> query_embedding) AS similarity
  FROM resume_embeddings re
  JOIN resume_uploads ru ON re.upload_id = ru.id
  WHERE ru.is_current = true
  ORDER BY re.embedding <=> query_embedding
  LIMIT 100
),

-- Full-text search: top 100 by BM25 relevance
fts_results AS (
  SELECT
    p.user_id,
    ROW_NUMBER() OVER (
      ORDER BY ts_rank_cd(
        to_tsvector('english',
          coalesce(p.full_name,'') || ' ' ||
          coalesce(p.headline,'') || ' ' ||
          coalesce(p.summary,'') || ' ' ||
          coalesce(array_to_string(cm.primary_skills,' '),'')
        ),
        plainto_tsquery('english', query_text)
      ) DESC
    ) AS rank
  FROM profiles p
  LEFT JOIN candidate_metadata cm ON cm.user_id = p.user_id
  WHERE
    to_tsvector('english',
      coalesce(p.full_name,'') || ' ' ||
      coalesce(p.headline,'') || ' ' ||
      coalesce(p.summary,'') || ' ' ||
      coalesce(array_to_string(cm.primary_skills,' '),'')
    ) @@ plainto_tsquery('english', query_text)
  LIMIT 100
),

-- RRF fusion
rrf AS (
  SELECT
    COALESCE(v.user_id, f.user_id) AS user_id,
    COALESCE(1.0/(rrf_k + v.rank), 0) + COALESCE(1.0/(rrf_k + f.rank), 0) AS score,
    v.rank AS vector_rank,
    f.rank AS fts_rank,
    v.similarity
  FROM vector_results v
  FULL OUTER JOIN fts_results f ON v.user_id = f.user_id
)

-- Join with metadata and apply filters
SELECT
  r.user_id,
  p.full_name,
  p.headline,
  p.city,
  p.availability_status,
  p.completion_pct,
  cm.total_exp_years,
  cm.primary_skills,
  r.score         AS rrf_score,
  r.vector_rank,
  r.fts_rank,
  r.similarity
FROM rrf r
JOIN profiles p ON p.user_id = r.user_id
LEFT JOIN candidate_metadata cm ON cm.user_id = r.user_id
WHERE
  (city_filter IS NULL OR p.city ILIKE '%' || city_filter || '%')
  AND (availability IS NULL OR p.availability_status = ANY(availability))
  AND (min_exp_years IS NULL OR cm.total_exp_years >= min_exp_years)
  AND (salary_min IS NULL OR p.salary_exp_min >= salary_min)
  AND (salary_max IS NULL OR p.salary_exp_max <= salary_max)
  AND (skill_filter IS NULL OR cm.primary_skills && skill_filter)
ORDER BY r.score DESC
LIMIT result_limit;

$$ LANGUAGE sql STABLE;
```

---

## 4. Query Processing (NLP Filter Extraction)

Before running the SQL, the admin's natural language query is processed to extract structured filters:

```typescript
// apps/web/app/api/admin/search/route.ts

async function extractFilters(query: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'system',
      content: `Extract search filters from this recruiter query. Return JSON:
      {
        "clean_query": "query without filter words",
        "city": string | null,
        "availability": ["open"|"open_to_offers"|"not_looking"] | null,
        "min_exp_years": number | null,
        "salary_min": number | null,
        "salary_max": number | null,
        "skills": string[] | null
      }`
    }, {
      role: 'user',
      content: query
    }]
  })
  return JSON.parse(response.choices[0].message.content)
}
```

**Example:**

Input: `"React engineers in Bangalore with 5+ years, open to work, from IIT or NIT"`

Extracted:
```json
{
  "clean_query": "React engineers IIT NIT",
  "city": "Bangalore",
  "availability": ["open", "open_to_offers"],
  "min_exp_years": 5,
  "salary_min": null,
  "skills": ["React"]
}
```

---

## 5. RAG for Candidate Explanation (M3 Extended)

When the admin wants to understand WHY a candidate ranked well, a RAG pipeline fetches the resume text and explains it.

```
Admin clicks "Why this candidate?"
          │
          ▼
Fetch resume text from Storage
          │
          ▼
GPT-4o-mini with context:
  System: "You are a recruiting assistant. Explain why this candidate
           matches the search query, citing specific evidence."
  User:   Query: {admin_query}
          Resume: {resume_text[:3000]}
          │
          ▼
Streaming explanation shown in admin UI
```

---

## 6. Vector DB Design

Using **pgvector inside Supabase PostgreSQL** — no separate vector database needed at 100K scale.

### Why pgvector over Pinecone/Weaviate

| Factor | pgvector | Pinecone |
|--------|----------|---------|
| Infrastructure | Same DB (Supabase) | Separate service |
| Cost at 100K docs | ~$0 extra | ~$70/mo |
| Metadata joins | Native SQL JOINs | Client-side |
| Consistency | ACID | Eventually consistent |
| Latency (ANN) | ~10ms | ~5ms |
| Scale limit | ~1M vectors | Unlimited |

At 100K resumes, pgvector with HNSW index returns results in < 50ms, well within acceptable UX range.

### Index Configuration

```sql
-- HNSW index: best balance of accuracy and speed
CREATE INDEX idx_resume_embeddings_hnsw
  ON resume_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (
    m = 16,               -- connections per node (higher = better recall, more RAM)
    ef_construction = 64  -- build time effort (higher = better index quality)
  );

-- Query time: SET hnsw.ef_search = 100 for higher recall
```

### HNSW Parameters for 100K Scale

| Parameter | Value | Reason |
|-----------|-------|--------|
| `m` | 16 | Good recall/speed balance; 32 for higher accuracy |
| `ef_construction` | 64 | Sufficient for 100K; increase to 128 for 1M |
| `ef_search` | 100 | Query-time effort; raise to 200 for better recall |
| Expected recall | ~95% | Sufficient for recruitment use case |
| Expected latency | < 20ms | With index warm in RAM |

---

## 7. Search API Design (M3)

### `POST /api/admin/search`

```typescript
// Request
{
  "query": "React engineers in Bangalore with 5+ years open to work",
  "page": 1,
  "limit": 20
}

// Response
{
  "results": [
    {
      "user_id": "uuid",
      "full_name": "Priya Sharma",
      "headline": "Senior React Engineer",
      "city": "Bangalore",
      "availability_status": "open",
      "total_exp_years": 7.5,
      "primary_skills": ["React", "TypeScript", "Node.js"],
      "rrf_score": 0.0324,
      "similarity": 0.87,
      "resume_url": "/api/resume/download/{upload_id}"
    }
  ],
  "total": 23,
  "filters_applied": {
    "city": "Bangalore",
    "availability": ["open"],
    "min_exp_years": 5
  },
  "query_time_ms": 145
}
```

---

## 8. Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Search latency (p50) | < 200ms | HNSW index + metadata index |
| Search latency (p95) | < 500ms | Connection pooling (pgBouncer) |
| Embedding generation | < 300ms | OpenAI `text-embedding-3-small` |
| Filter extraction | < 400ms | GPT-4o-mini (fast model) |
| Total search UX | < 1s | Parallel: embed + filter extract |
