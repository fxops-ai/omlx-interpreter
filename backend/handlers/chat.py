# /backend/handlers/chat.py
import asyncio
import base64
import mimetypes
import os
import threading
import traceback
import uuid
from pathlib import Path
from typing import Any, Dict, List, Set

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from interpreter import interpreter

load_dotenv(dotenv_path=Path(__file__).parents[2] / ".env")

router = APIRouter(prefix="/chat")

OMLX_BASE    = "http://127.0.0.1:8000/v1"
OMLX_API_KEY = os.getenv("OMLX_API_KEY", "dummy")

SANDBOX_ROOT = Path(__file__).parents[2] / "sandbox"

# ---------------------------------------------------------------------------
# System prompt — injected into every session
# Keeps the model from doing things that break the headless environment.
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are a helpful coding assistant running inside oMLX Interpreter.

Environment rules — always follow these:
- matplotlib: NEVER call plt.show(). Always save figures with plt.savefig('figure.png', dpi=150, bbox_inches='tight') and then close with plt.close(). Use matplotlib.use('Agg') at the top of any script that imports matplotlib.
- File output: when producing output files (images, CSVs, etc.), always save them to the current directory using relative paths.
- Dependencies: if a package is missing, install it with pip then proceed in the same response.
- Be concise: don't over-explain after a successful execution. Show the output and confirm it worked.
"""


# ---------------------------------------------------------------------------
# HTTP models
# ---------------------------------------------------------------------------

class Message(BaseModel):
    role: str
    content: str | List[Dict[str, Any]]


class ChatRequest(BaseModel):
    messages: List[Message]
    chat_id: str = "default"


@router.post("")
async def chat(request: ChatRequest):
    raise HTTPException(501, "Use WebSocket /chat/ws for full features")


# ---------------------------------------------------------------------------
# Models endpoint
# ---------------------------------------------------------------------------

@router.get("/models")
async def list_models():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{OMLX_BASE}/models",
                headers={"Authorization": f"Bearer {OMLX_API_KEY}"},
            )
            raw = resp.json()
            models = [
                {
                    "id":    item["id"].removeprefix("openai/"),
                    "label": item["id"].removeprefix("openai/"),
                }
                for item in raw.get("data", [])
            ]
            return {"models": models}
    except Exception as e:
        raise HTTPException(502, f"Could not reach oMLX server: {e}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def get_active_model() -> str:
    print(f"[MODEL] Querying {OMLX_BASE}/models ...", flush=True)
    for attempt in range(5):
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{OMLX_BASE}/models",
                    headers={"Authorization": f"Bearer {OMLX_API_KEY}"},
                )
                raw = resp.json()
                model_id = raw["data"][0]["id"]
                result = f"openai/{model_id.removeprefix('openai/')}"
                print(f"[MODEL] Selected: {result}", flush=True)
                return result
        except Exception as e:
            print(f"[MODEL] Attempt {attempt + 1}/5 failed: {e}", flush=True)
            await asyncio.sleep(2)
    raise RuntimeError(f"oMLX server unreachable at {OMLX_BASE} — is it running?")


def configure_interpreter(model: str, sandbox_dir: Path) -> None:
    base_model = model.removeprefix("openai/")
    interpreter.llm.api_base        = OMLX_BASE
    interpreter.llm.model           = f"openai/{base_model}"
    interpreter.llm.api_key         = OMLX_API_KEY
    interpreter.llm.supports_vision = False
    interpreter.auto_run            = True
    interpreter.system_message      = SYSTEM_PROMPT
    interpreter.computer.cwd        = str(sandbox_dir)
    print(f"[MODEL] Configured: openai/{base_model} | cwd={sandbox_dir}")


def snapshot_sandbox(sandbox_dir: Path) -> Set[Path]:
    if not sandbox_dir.exists():
        return set()
    return {p for p in sandbox_dir.rglob("*") if p.is_file()}


def build_file_artifact(path: Path, sandbox_dir: Path) -> Dict:
    relative = path.relative_to(sandbox_dir)
    mime, _ = mimetypes.guess_type(str(path))
    mime = mime or "application/octet-stream"
    is_text = mime.startswith("text/") or mime in (
        "application/json",
        "application/javascript",
        "application/xml",
    )
    if is_text:
        try:
            content = path.read_text(encoding="utf-8")
            return {
                "type":     "file",
                "filename": str(relative),
                "mime":     mime,
                "content":  content,
            }
        except UnicodeDecodeError:
            pass
    raw = path.read_bytes()
    return {
        "type":        "file",
        "filename":    str(relative),
        "mime":        mime,
        "content_b64": base64.b64encode(raw).decode(),
    }


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket):
    print("[WS] New connection — accepting", flush=True)
    await websocket.accept()

    session_id  = str(uuid.uuid4())[:8]
    sandbox_dir = SANDBOX_ROOT / session_id
    sandbox_dir.mkdir(parents=True, exist_ok=True)
    await websocket.send_json({"type": "session", "session_id": session_id})
    print(f"[WS] Sandbox: {sandbox_dir}", flush=True)

    try:
        _initial_model = await get_active_model()
        configure_interpreter(_initial_model, sandbox_dir)
        print(f"[WS] Ready — model={_initial_model}", flush=True)
    except RuntimeError as e:
        print(f"[WS] Startup failed: {e}", flush=True)
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
            await websocket.close()
        except Exception:
            pass
        return

    state: Dict[str, str] = {"model": _initial_model}
    stop_flag = threading.Event()
    stream_task: asyncio.Task | None = None

    # -----------------------------------------------------------------------
    # Stream response
    # -----------------------------------------------------------------------
    async def stream_response(messages: List[Dict], ws: WebSocket):
        nonlocal stop_flag
        loop = asyncio.get_event_loop()
        stop_flag.clear()

        queue: asyncio.Queue = asyncio.Queue()

        conv = [
            {"role": m["role"], "type": "message", "content": m["content"]}
            for m in messages
        ]

        def run_interpreter():
            try:
                interpreter.messages = conv[:-1]
                last_content = conv[-1]["content"]
                print(f"[STREAM] starting | model={state['model']} | history={len(conv)-1} msgs")

                for chunk in interpreter.chat(last_content, stream=True, display=False):
                    if stop_flag.is_set():
                        print("[STREAM] stop_flag — exiting interpreter loop")
                        break
                    print(f"[CHUNK] {chunk}")
                    loop.call_soon_threadsafe(queue.put_nowait, chunk)

            except Exception as e:
                if not stop_flag.is_set():
                    print(f"[INTERPRETER ERROR] {type(e).__name__}: {e}")
                    traceback.print_exc()
                    loop.call_soon_threadsafe(queue.put_nowait, {"__error__": str(e)})
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

        thread = threading.Thread(target=run_interpreter, daemon=True)
        thread.start()

        current_code    = ""
        current_lang    = "python"
        console_buf     = ""   # accumulates output lines within one console block

        # Track sandbox state to detect new non-script files (e.g. saved images)
        sandbox_before: Set[Path] = snapshot_sandbox(sandbox_dir)
        # Track script filenames we've already emitted so we don't re-emit on done
        emitted_scripts: Set[str] = set()

        try:
            while True:
                chunk = await queue.get()

                if chunk is None:
                    # Interpreter finished — emit any new files created during the session
                    # (e.g. figure.png from plt.savefig) that weren't emitted as scripts
                    sandbox_after = snapshot_sandbox(sandbox_dir)
                    new_files = sandbox_after - sandbox_before
                    for fpath in sorted(new_files):
                        rel = str(fpath.relative_to(sandbox_dir))
                        if rel not in emitted_scripts:
                            try:
                                file_artifact = build_file_artifact(fpath, sandbox_dir)
                                await ws.send_json({"type": "artifact", "data": file_artifact})
                                print(f"[FILE] Emitted on done: {fpath.name}")
                            except Exception as fe:
                                print(f"[FILE] Failed: {fpath}: {fe}")
                    break

                if stop_flag.is_set():
                    continue

                if not isinstance(chunk, dict):
                    continue

                if "__error__" in chunk:
                    await ws.send_json({"type": "error", "content": chunk["__error__"]})
                    continue

                role       = chunk.get("role")
                chunk_type = chunk.get("type")

                # -- Assistant text --
                if role == "assistant" and chunk_type == "message":
                    if "content" in chunk:
                        await ws.send_json({"type": "delta", "content": chunk["content"]})

                # -- Assistant code --
                elif role == "assistant" and chunk_type == "code":
                    if "start" in chunk:
                        current_code = ""
                        current_lang = chunk.get("format", "python")
                    elif "content" in chunk:
                        current_code += chunk["content"]
                    elif "end" in chunk:
                        # Save the code block as a file in the sandbox
                        ext_map = {
                            "python": "py", "javascript": "js", "typescript": "ts",
                            "bash": "sh", "shell": "sh", "ruby": "rb",
                            "rust": "rs", "go": "go", "java": "java",
                        }
                        ext = ext_map.get(current_lang, "txt")
                        code_filename = f"script_{uuid.uuid4().hex[:6]}.{ext}"
                        code_path = sandbox_dir / code_filename
                        code_path.write_text(current_code, encoding="utf-8")
                        emitted_scripts.add(code_filename)
                        print(f"[FILE] Saved code: {code_path}")
                        # Emit as file artifact
                        mime = "text/x-python" if ext == "py" else "text/plain"
                        await ws.send_json({
                            "type": "artifact",
                            "data": {
                                "type":     "file",
                                "filename": code_filename,
                                "mime":     mime,
                                "content":  current_code,
                            },
                        })

                # -- Computer console output — BUFFERED per block --
                elif role == "computer" and chunk_type == "console":
                    if "start" in chunk:
                        console_buf = ""  # start of a new console block
                    elif chunk.get("format") == "output" and "content" in chunk:
                        console_buf += chunk["content"]  # accumulate
                    elif "end" in chunk:
                        # Emit the whole block as a single artifact
                        output = console_buf.strip()
                        if output:
                            await ws.send_json({
                                "type": "artifact",
                                "data": {"type": "output", "content": output},
                            })
                        console_buf = ""

                # -- Images / HTML --
                elif chunk_type in ("image", "html") and "content" in chunk:
                    await ws.send_json({
                        "type": "artifact",
                        "data": {"type": chunk_type, "content": chunk["content"]},
                    })

                elif chunk_type == "confirmation":
                    pass  # auto_run=True, never need to handle

            await ws.send_json({"type": "done"})

        except asyncio.CancelledError:
            stop_flag.set()
            raise

        except Exception as e:
            if not stop_flag.is_set():
                print(f"[STREAM EXCEPTION] {e}")
                traceback.print_exc()
                try:
                    await ws.send_json({"type": "error", "content": str(e)})
                except Exception:
                    pass

    # -----------------------------------------------------------------------
    # Cancel helper
    # -----------------------------------------------------------------------
    async def cancel_stream():
        nonlocal stream_task
        stop_flag.set()
        if stream_task and not stream_task.done():
            stream_task.cancel()
            try:
                await stream_task
            except asyncio.CancelledError:
                pass
        stop_flag.clear()

    # -----------------------------------------------------------------------
    # Main receive loop
    # -----------------------------------------------------------------------
    try:
        while True:
            data     = await websocket.receive_json()
            msg_type = data.get("type")
            print(f"[WS RECV] type={msg_type!r} keys={list(data.keys())} msgs={len(data.get('messages', []))}", flush=True)

            if msg_type == "interrupt":
                await cancel_stream()
                await websocket.send_json({"type": "interrupted"})
                continue

            messages = data.get("messages", [])
            if not messages:
                continue

            if stream_task and not stream_task.done():
                await cancel_stream()

            requested_model = data.get("model")
            if requested_model:
                new_model = f"openai/{requested_model.removeprefix('openai/')}"
                if new_model != state["model"]:
                    state["model"] = new_model
                    configure_interpreter(new_model, sandbox_dir)
                    print(f"[MODEL] Switched to: {new_model}")
            else:
                try:
                    new_model = await get_active_model()
                    if new_model != state["model"]:
                        state["model"] = new_model
                        configure_interpreter(new_model, sandbox_dir)
                except RuntimeError:
                    pass

            stream_task = asyncio.create_task(
                stream_response(messages, websocket)
            )

    except WebSocketDisconnect:
        print("[WS] Client disconnected")
        await cancel_stream()

    except Exception as e:
        print(f"[WS ERROR] {e}")
        traceback.print_exc()
        stop_flag.set()
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
        if stream_task:
            stream_task.cancel()
