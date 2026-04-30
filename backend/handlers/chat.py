from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import json

from openinterpreter import interpreter

router = APIRouter(prefix="/chat")

class Message(BaseModel):
    role: str
    content: str | List[Dict[str, Any]]

class ChatRequest(BaseModel):
    messages: List[Message]
    chat_id: str = "default"
    model: str = "mlx-community/Qwen2.5-32B-Instruct-4bit"  # ← Change to your oMLX model

@router.post("/")
async def chat(request: ChatRequest):
    try:
        # Configure interpreter to use oMLX
        interpreter.llm.api_base = "http://localhost:8000/v1"
        interpreter.llm.model = request.model
        interpreter.llm.api_key = "dummy"
        interpreter.auto_run = False  # Safety: show code before running

        # Build conversation
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        async def stream_response():
            full_response = ""
            for chunk in interpreter.chat(messages, stream=True, display=False):
                if isinstance(chunk, str):
                    full_response += chunk
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                # TODO: Detect code blocks for artifacts

            yield f"data: {json.dumps({'done': True, 'full_response': full_response})}\n\n"

        return StreamingResponse(stream_response(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
