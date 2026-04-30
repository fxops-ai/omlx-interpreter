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
    model: str = "mlx-community/Qwen2.5-32B-Instruct-4bit"  # Update to your model

@router.post("/")
async def chat(request: ChatRequest):
    try:
        interpreter.llm.api_base = "http://localhost:8000/v1"
        interpreter.llm.model = request.model
        interpreter.llm.api_key = "dummy"
        interpreter.auto_run = False   # Important: show code before running

        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        async def stream_response():
            for chunk in interpreter.chat(messages, stream=True, display=False):
                if isinstance(chunk, str):
                    yield f"data: {json.dumps({'delta': chunk})}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"

        return StreamingResponse(stream_response(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
