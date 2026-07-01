# Verity — AI Research Assistant for PDFs

Verity lets you upload a PDF and ask questions about it in natural language. It retrieves the most relevant passages using vector search + reranking, then generates a grounded answer with page-level citations.

---

## Features

- Drag-and-drop PDF upload (up to 10MB), parsed and indexed automatically
- Conversational Q&A with inline citations showing source pages
- Per-browser session isolation via a private client ID — no cross-user data leaks on a shared link
- Browsable, deletable session history with full query logs
- Smart query handling: overview questions pull from first/last pages directly; enumeration questions ("list all tables") pin every matching chunk; failed answers get one automatic retry with broader context
- Deterministic answers — a context-derived seed keeps repeated questions consistent
- Light/dark mode with persisted preference
- Resilient to ephemeral hosting — configurable `DATA_DIR` for persistent storage, plus periodic health pings to reduce idle restarts

---

## How it works (RAG pipeline)

1. **Parse** — PyMuPDF extracts text page-by-page (`pdf_parser.py`)
2. **Chunk & embed** — pages are split with LangChain and embedded via `BAAI/bge-base-en-v1.5` into a FAISS index (`vector_store.py`)
3. **Retrieve** — FAISS MMR search, with page-1, last-page, and table-mention chunks always pinned into the candidate pool
4. **Rerank** — a CrossEncoder (`ms-marco-MiniLM-L-6-v2`) reorders candidates by relevance; meta/overview questions skip this and use pinned pages directly (`reranker.py`)
5. **Generate** — top chunks go to a Groq LLM with a strict grounding prompt: answer only from provided pages, cite them, or say nothing was found (`rag_pipeline.py`)
6. **Persist** — question, answer, and pages used are saved to SQLite, scoped to the requesting client (`database.py`)

---

## Tech Stack

**Backend:** FastAPI, PyMuPDF, LangChain, FAISS, sentence-transformers (CrossEncoder), HuggingFace embeddings, Groq API, SQLite

**Frontend:** React, Vite, Tailwind CSS, Axios, react-dropzone, react-hot-toast, lucide-react

---

## Project Structure

```
backend/
├── main.py            # FastAPI routes + retrieval/answer orchestration
├── pdf_parser.py       # PDF text extraction
├── vector_store.py     # Chunking, embedding, FAISS search + pinning
├── reranker.py          # CrossEncoder reranking
├── rag_pipeline.py     # Prompting + Groq LLM call
├── database.py         # SQLite session/query persistence
├── metadata.py         # Per-session metadata.json
└── requirements.txt

frontend/
├── src/
│   ├── App.jsx
│   ├── api.js
│   └── components/
│       ├── Navbar.jsx
│       ├── Sidebar.jsx
│       ├── UploadZone.jsx
│       ├── ChatWindow.jsx
│       └── CitationCard.jsx
```

---

## Setup

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

`.env`:
```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile   # optional, default shown
DATA_DIR=.                           # optional; point at a persistent volume in production
```

```bash
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
```

`.env`:
```env
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

---

## API Reference

All routes except `/health` require an `X-Client-Id` header (generated once per browser, stored in `localStorage`).

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/upload` | Upload + index a PDF (`multipart/form-data`, field `file`) |
| POST | `/ask` | Ask a question — `{ session_id, question }` |
| GET | `/sessions` | List sessions for the requesting client |
| GET | `/sessions/{session_id}` | Get a session's metadata |
| GET | `/sessions/{session_id}/history` | Get a session's Q&A history |
| DELETE | `/sessions/{session_id}` | Delete a session and its files |

---
