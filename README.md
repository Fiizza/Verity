# Verity: Retrieval-Augmented PDF Research Platform

Verity is an AI-powered research platform that enables users to upload PDF documents and ask questions in natural language. It leverages a Retrieval-Augmented Generation (RAG) pipeline to retrieve relevant information and generate accurate, grounded responses with page-level citations.

---

## Features

- Upload PDF files (up to 10 MB) with automatic parsing and indexing.
- Ask questions in natural language and receive contextual answers.
- Page-level citations for transparent and verifiable responses.
- Browser-specific session isolation using unique client IDs.
- Persistent session history with complete query logs.
- Smart retrieval for overview and enumeration-based questions.
- Deterministic responses for improved answer consistency.
- Light and Dark mode support.
- Persistent storage support through configurable `DATA_DIR`.

---

## System Architecture

```
                User
                  │
                  ▼
          React Frontend
                  │
                  ▼
          FastAPI Backend
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
PDF Parser   Vector Store   SQLite Database
(PyMuPDF)      (FAISS)         Sessions
    │
    ▼
CrossEncoder Reranker
    │
    ▼
Groq Large Language Model
    │
    ▼
Grounded Response with Citations
```

---

## Retrieval-Augmented Generation (RAG) Pipeline

### 1. PDF Parsing

Documents are parsed page by page using **PyMuPDF**.

### 2. Chunking & Embeddings

Extracted text is divided into chunks and converted into vector embeddings using:

- BAAI/bge-base-en-v1.5

The embeddings are stored inside a **FAISS Vector Database**.

### 3. Retrieval

Relevant document chunks are retrieved using:

- FAISS
- Maximum Marginal Relevance (MMR)
- Pinned first/last pages
- Table-aware retrieval

### 4. Reranking

Retrieved chunks are reranked using:

- CrossEncoder
- ms-marco-MiniLM-L-6-v2

to improve relevance before generation.

### 5. Response Generation

The highest-ranked chunks are passed to a **Groq LLM**, which generates grounded responses using only the retrieved context.

### 6. Persistence

Session metadata, questions, answers, and citation history are stored in **SQLite**.

---

## Technology Stack

### Backend

- FastAPI
- PyMuPDF
- LangChain
- FAISS
- HuggingFace Embeddings
- Sentence Transformers
- CrossEncoder
- Groq API
- SQLite

### Frontend

- React
- Vite
- Tailwind CSS
- Axios
- React Dropzone
- React Hot Toast
- Lucide React

---

## Project Structure

```
backend/
├── main.py
├── pdf_parser.py
├── vector_store.py
├── reranker.py
├── rag_pipeline.py
├── database.py
├── metadata.py
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

## Installation

### Backend

```bash
cd backend

python -m venv venv

source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

### Environment Variables

```env
GROQ_API_KEY=your_api_key

GROQ_MODEL=llama-3.3-70b-versatile

DATA_DIR=.
```

Run the backend:

```bash
uvicorn main:app --reload
```

---

### Frontend

```bash
cd frontend

npm install
```

Create a `.env` file.

```env
VITE_API_URL=http://localhost:8000
```

Run:

```bash
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Upload and index a PDF |
| POST | `/ask` | Ask questions |
| GET | `/sessions` | Retrieve user sessions |
| GET | `/sessions/{session_id}` | Session metadata |
| GET | `/sessions/{session_id}/history` | Conversation history |
| DELETE | `/sessions/{session_id}` | Delete session |

---

## Design Highlights

- Browser-level session isolation
- Grounded responses with citations
- CrossEncoder reranking for higher retrieval accuracy
- Deterministic answer generation
- Persistent conversation history
- Modular backend architecture
- Optimized semantic search using FAISS

---

## Deployment

For production deployments, configure a persistent `DATA_DIR` to retain:

- Uploaded PDFs
- FAISS vector indexes
- SQLite database
- Session metadata

If an index is unavailable after deployment, the application prompts the user to upload the document again.



## License

This project is intended for educational and research purposes.

---

## Author

**Fizza Akram**

GitHub: https://github.com/Fiizza