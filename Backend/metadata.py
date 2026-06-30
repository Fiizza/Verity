import json
import os
from datetime import datetime

def save_metadata(session_id: str, filename: str, pages_indexed: int,
                  file_size_kb: int, index_path: str):
    meta = {
        "session_id": session_id,
        "filename": filename,
        "pages_indexed": pages_indexed,
        "file_size_kb": file_size_kb,
        "created_at": datetime.utcnow().isoformat(),
        "index_path": index_path
    }
    meta_path = os.path.join(index_path, "metadata.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

def load_metadata(index_path: str) -> dict | None:
    meta_path = os.path.join(index_path, "metadata.json")
    if not os.path.exists(meta_path):
        return None
    with open(meta_path, "r") as f:
        return json.load(f)