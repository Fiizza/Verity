import sqlite3
import os
from datetime import datetime

DB_PATH = "rag_sessions.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id     TEXT PRIMARY KEY,
            filename       TEXT NOT NULL,
            pages_indexed  INTEGER NOT NULL,
            file_size_kb   INTEGER NOT NULL,
            created_at     TEXT NOT NULL,
            index_path     TEXT NOT NULL,
            pdf_path       TEXT NOT NULL,
            client_id      TEXT NOT NULL DEFAULT ''
        )
    """)

    # FIX: per-user session isolation. If this DB file was created before
    # client_id existed, add the column on startup so old deployments don't
    # crash on the new INSERT/SELECT statements.
    cursor.execute("PRAGMA table_info(sessions)")
    existing_cols = [row[1] for row in cursor.fetchall()]
    if "client_id" not in existing_cols:
        cursor.execute("ALTER TABLE sessions ADD COLUMN client_id TEXT NOT NULL DEFAULT ''")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS queries (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id     TEXT NOT NULL,
            question       TEXT NOT NULL,
            answer         TEXT NOT NULL,
            pages_used     TEXT NOT NULL,
            asked_at       TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)
    conn.commit()
    conn.close()

def save_session(session_id: str, filename: str, pages_indexed: int,
                 file_size_kb: int, index_path: str, pdf_path: str, client_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sessions 
        (session_id, filename, pages_indexed, file_size_kb, created_at, index_path, pdf_path, client_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        filename,
        pages_indexed,
        file_size_kb,
        datetime.utcnow().isoformat(),
        index_path,
        pdf_path,
        client_id
    ))
    conn.commit()
    conn.close()

def save_query(session_id: str, question: str, answer: str, pages_used: list):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO queries
        (session_id, question, answer, pages_used, asked_at)
        VALUES (?, ?, ?, ?, ?)
    """, (
        session_id,
        question,
        answer,
        ",".join(str(p) for p in pages_used),
        datetime.utcnow().isoformat()
    ))
    conn.commit()
    conn.close()

def get_session(session_id: str) -> dict | None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM sessions WHERE session_id = ?",
        (session_id,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "session_id": row[0],
        "filename": row[1],
        "pages_indexed": row[2],
        "file_size_kb": row[3],
        "created_at": row[4],
        "index_path": row[5],
        "pdf_path": row[6],
        "client_id": row[7]
    }

def get_all_sessions(client_id: str) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # FIX: only return sessions belonging to this client, so one person's
    # uploads/history never show up for someone else opening the same link.
    cursor.execute(
        "SELECT * FROM sessions WHERE client_id = ? ORDER BY created_at DESC",
        (client_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "session_id": r[0],
            "filename": r[1],
            "pages_indexed": r[2],
            "file_size_kb": r[3],
            "created_at": r[4]
        }
        for r in rows
    ]

def get_session_queries(session_id: str) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT question, answer, pages_used, asked_at FROM queries WHERE session_id = ? ORDER BY asked_at DESC",
        (session_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "question": r[0],
            "answer": r[1],
            "pages_used": r[2],
            "asked_at": r[3]
        }
        for r in rows
    ]

# FIX: This function was missing entirely.
# Without it, DELETE /sessions/{id} never touched the DB,
# so deleted sessions reappeared on every page reload.
def delete_session_from_db(session_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Delete child rows first to respect the foreign key constraint
    cursor.execute("DELETE FROM queries WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()