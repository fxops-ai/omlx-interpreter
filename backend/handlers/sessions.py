# /backend/handlers/sessions.py
import json
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/chat/sessions")

# Must match SANDBOX_ROOT in chat.py
SANDBOX_ROOT = Path(__file__).parents[2] / "sandbox"

MAX_FILE_SEARCH_BYTES = 100 * 1024  # 100 KB cap for content search


def _read_session(session_file: Path) -> Optional[dict]:
    try:
        return json.loads(session_file.read_text(encoding="utf-8"))
    except Exception:
        return None


def _all_sessions() -> list[dict]:
    """Walk sandbox/*/session.json and return all valid sessions, sorted newest first."""
    sessions = []
    if not SANDBOX_ROOT.exists():
        return sessions
    for session_dir in SANDBOX_ROOT.iterdir():
        if not session_dir.is_dir():
            continue
        session_file = session_dir / "session.json"
        if not session_file.exists():
            continue
        data = _read_session(session_file)
        if data:
            sessions.append(data)
    sessions.sort(key=lambda s: s.get("updated_at", ""), reverse=True)
    return sessions


@router.get("")
async def list_sessions():
    """Return all sessions sorted by updated_at desc — summary fields only."""
    sessions = _all_sessions()
    result = []
    for s in sessions:
        result.append({
            "session_id":    s.get("session_id", ""),
            "title":         s.get("title", ""),
            "updated_at":    s.get("updated_at", ""),
            "model":         s.get("model", ""),
            "message_count": len(s.get("messages", [])),
            "artifact_count": len(s.get("artifacts", [])),
        })
    return {"sessions": result}


@router.get("/search")
async def search_sessions(q: str = Query(..., min_length=1)):
    """
    Case-insensitive search across title, message content, and sandbox filenames/text.
    Returns matching sessions with a match_excerpt (120 chars max).
    """
    q_lower = q.lower()
    results = []

    for s in _all_sessions():
        session_id = s.get("session_id", "")
        title = s.get("title", "")
        messages = s.get("messages", [])
        artifacts = s.get("artifacts", [])

        excerpt: Optional[str] = None

        # 1. Title match
        if q_lower in title.lower():
            excerpt = title[:120]

        # 2. Message content match
        if excerpt is None:
            for m in messages:
                content = m.get("content", "")
                if q_lower in content.lower():
                    idx = content.lower().find(q_lower)
                    start = max(0, idx - 40)
                    end = min(len(content), idx + 80)
                    excerpt = ("…" if start > 0 else "") + content[start:end].strip() + ("…" if end < len(content) else "")
                    excerpt = excerpt[:120]
                    break

        # 3. Artifact filename match
        if excerpt is None:
            for art in artifacts:
                fname = art.get("filename", "")
                if q_lower in fname.lower():
                    excerpt = f"file: {fname}"
                    break

        # 4. Text file content match (capped at 100 KB)
        if excerpt is None:
            sandbox_dir = SANDBOX_ROOT / session_id
            if sandbox_dir.exists():
                for fpath in sorted(sandbox_dir.rglob("*")):
                    if fpath.name == "session.json" or not fpath.is_file():
                        continue
                    if fpath.stat().st_size > MAX_FILE_SEARCH_BYTES:
                        continue
                    try:
                        text = fpath.read_text(encoding="utf-8", errors="ignore")
                        if q_lower in text.lower():
                            idx = text.lower().find(q_lower)
                            start = max(0, idx - 40)
                            end = min(len(text), idx + 80)
                            snippet = ("…" if start > 0 else "") + text[start:end].strip() + ("…" if end < len(text) else "")
                            excerpt = f"{fpath.name}: {snippet[:100]}"
                            break
                    except Exception:
                        continue

        if excerpt is not None:
            results.append({
                "session_id":  session_id,
                "title":       title,
                "updated_at":  s.get("updated_at", ""),
                "match_excerpt": excerpt,
            })

    return {"results": results}


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Return full session.json with availability flags on each artifact."""
    session_file = SANDBOX_ROOT / session_id / "session.json"
    if not session_file.exists():
        raise HTTPException(status_code=404, detail="Session not found")

    data = _read_session(session_file)
    if data is None:
        raise HTTPException(status_code=500, detail="Failed to read session")

    sandbox_dir = SANDBOX_ROOT / session_id

    # Add availability flag to each artifact
    artifacts_with_availability = []
    for art in data.get("artifacts", []):
        fname = art.get("filename", "")
        available = (sandbox_dir / fname).exists() if fname else False
        artifacts_with_availability.append({**art, "available": available})

    return {**data, "artifacts": artifacts_with_availability}
