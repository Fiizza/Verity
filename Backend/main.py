import os
import uuid
import shutil
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pdf_parser import extract_text_from_pdf
from vector_store import build_vector_store, search_vector_store, embeddings
from rag_pipeline import generate_answer
from reranker import rerank_chunks
from database import init_db, save_session, save_query, get_session, get_all_sessions, get_session_queries, delete_session_from_db
from metadata import save_metadata

from langchain_community.vectorstores import FAISS



logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



app = FastAPI(
    title="RAG Research Assistant",
    description="Upload PDFs and ask questions using RAG",
    version="3.0.0"
)

@app.on_event("startup")
def startup():
    init_db()
    logger.info("Database initialized.")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  
        "https://verity-pi-brown.vercel.app", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



UPLOADS_DIR = "uploads"
INDEX_DIR = "indices"

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(INDEX_DIR, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB



vector_stores = {}



class QuestionRequest(BaseModel):
    session_id: str
    question: str


# FIX: per-user isolation. Every browser sends a stable client ID
# (generated and stored in localStorage on the frontend) via this header.
# We use it to scope which sessions a request is allowed to see/touch, so
# that sharing the app link with someone else never exposes your uploaded
# documents or chat history to them.
def require_client_id(x_client_id: str = Header(..., alias="X-Client-Id")) -> str:
    if not x_client_id.strip():
        raise HTTPException(status_code=400, detail="Missing X-Client-Id header.")
    return x_client_id


def get_owned_session(session_id: str, client_id: str) -> dict:
    session = get_session(session_id)
    if not session or session.get("client_id") != client_id:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


@app.get("/health")
def health():
    return {"status": "ok", "message": "Backend is running."}


@app.get("/sessions")
def list_sessions(x_client_id: str = Header(..., alias="X-Client-Id")):
    return get_all_sessions(x_client_id)


@app.get("/sessions/{session_id}")
def get_session_info(session_id: str, x_client_id: str = Header(..., alias="X-Client-Id")):
    return get_owned_session(session_id, x_client_id)


@app.get("/sessions/{session_id}/history")
def get_history(session_id: str, x_client_id: str = Header(..., alias="X-Client-Id")):
    get_owned_session(session_id, x_client_id)
    return get_session_queries(session_id)


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), x_client_id: str = Header(..., alias="X-Client-Id")):

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Maximum allowed PDF size is 10 MB.")

    session_id = str(uuid.uuid4())

    # Save PDF to disk
    pdf_path = os.path.join(UPLOADS_DIR, f"{session_id}.pdf")
    with open(pdf_path, "wb") as f:
        f.write(contents)
    logger.info(f"Saved PDF -> {pdf_path}")

    # Extract text
    logger.info("Extracting PDF text...")
    pages = extract_text_from_pdf(contents)

    if not pages:
        os.remove(pdf_path)
        raise HTTPException(status_code=400, detail="No readable text found inside PDF.")

    # Build FAISS index
    logger.info("Building FAISS index...")
    vector_store = build_vector_store(pages)

    # Save index to disk
    index_path = os.path.join(INDEX_DIR, session_id)
    os.makedirs(index_path, exist_ok=True)
    vector_store.save_local(index_path)
    logger.info(f"Saved FAISS index -> {index_path}")

    # Save metadata.json
    file_size_kb = len(contents) // 1024
    save_metadata(session_id, file.filename, len(pages), file_size_kb, index_path)

    # Save to SQLite (tagged with the owning client)
    save_session(
        session_id=session_id,
        filename=file.filename,
        pages_indexed=len(pages),
        file_size_kb=file_size_kb,
        index_path=index_path,
        pdf_path=pdf_path,
        client_id=x_client_id
    )

    # Cache in memory
    vector_stores[session_id] = vector_store

    return {
        "message": "PDF uploaded and indexed successfully.",
        "session_id": session_id,
        "filename": file.filename,
        "pages_indexed": len(pages),
        "file_size_kb": file_size_kb
    }


@app.post("/ask")
def ask_question(request: QuestionRequest, x_client_id: str = Header(..., alias="X-Client-Id")):

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # FIX: confirm this session actually belongs to the requesting client
    # before answering anything from it (or even loading its index).
    get_owned_session(request.session_id, x_client_id)

    # Load from memory or disk
    if request.session_id not in vector_stores:
        index_path = os.path.join(INDEX_DIR, request.session_id)
        if not os.path.exists(index_path):
            raise HTTPException(status_code=404, detail="Session not found. Please upload a PDF first.")
        logger.info("Loading FAISS index from disk...")
        vector_stores[request.session_id] = FAISS.load_local(
            index_path,
            embeddings,
            allow_dangerous_deserialization=True
        )

    # Retrieve
    retrieved_chunks = search_vector_store(
        vector_stores[request.session_id],
        request.question,
        k=15
    )

    if not retrieved_chunks:
        return {
            "answer": "I couldn't find any relevant information in the uploaded document.",
            "sources": [],
            "pages": [],
            "num_sources": 0
        }

    # FIX: enumeration-style questions ("list all tables", "how many
    # tables") can have more relevant chunks than a normal focused
    # question does — vector_store.py now pins every "Table N" chunk into
    # the candidate pool for these queries, but a flat top_k=6 reranker
    # cutoff could still silently drop some of them before they reach the
    # LLM. Widen the cutoff just for this query type so pinned chunks
    # aren't truncated away after being correctly retrieved.
    question_lower = request.question.lower()
    is_enumeration_query = any(
        kw in question_lower
        for kw in ("table", "tables", "how many", "list all", "all the", "every")
    )
    rerank_top_k = 12 if is_enumeration_query else 6

    best_chunks = rerank_chunks(request.question, retrieved_chunks, top_k=rerank_top_k)

    # If reranker still returns nothing (edge case), fall back to
    # top 5 raw retrieved chunks so we never pass an empty list to the LLM.
    if not best_chunks:
        logger.warning("Reranker returned 0 chunks — falling back to raw retrieval top-5.")
        best_chunks = retrieved_chunks[:5]

    # Generate answer
    result = generate_answer(request.question, best_chunks)

    # Save query to DB
    save_query(
        session_id=request.session_id,
        question=request.question,
        answer=result["answer"],
        pages_used=result.get("pages", [])
    )

    return result


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str, x_client_id: str = Header(..., alias="X-Client-Id")):
    session = get_owned_session(session_id, x_client_id)

    # Remove files from disk
    if os.path.exists(session["pdf_path"]):
        os.remove(session["pdf_path"])

    if os.path.exists(session["index_path"]):
        shutil.rmtree(session["index_path"])

    # Remove from memory cache
    vector_stores.pop(session_id, None)

   
    delete_session_from_db(session_id)

    return {"message": f"Session {session_id} deleted successfully."}


@app.post("/debug/extract")
async def debug_extract(file: UploadFile = File(...)):
    contents = await file.read()
    import fitz
    doc = fitz.open(stream=contents, filetype="pdf")
    page = doc[0]

    blocks = page.get_text("blocks")
    blocks_sorted = sorted(blocks, key=lambda b: (round(b[1] / 20), b[0]))
    block_texts = [b[4].strip() for b in blocks_sorted if b[4].strip()]

    return {
        "raw_text": page.get_text("text"),
        "blocks": block_texts
    }