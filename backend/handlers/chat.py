from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio

from openinterpreter import interpreter
from litellm import completion

router = APIRouter(prefix="/chat")

class Message(BaseModel):
    role: str
    content: str | List[Dict[str, Any]]

class ChatRequest(BaseModel):
    messages: List[Message]
    chat_id: str = "default"
    model: str = "mlx-community/model-name"  # Change to your oMLX model
    stream: bool = True

@router.post("/")
async def chat(request: ChatRequest):
    try:
        # Configure Open Interpreter to use oMLX
        interpreter.llm.api_base = "http://localhost:8000/v1"  # oMLX default
        interpreter.llm.model = request.model
        interpreter.llm.api_key = "dummy"  # oMLX doesn't need real key

        # Convert messages for Open Interpreter
        conversation = []
        for msg in request.messages:
            conversation.append({"role": msg.role, "content": msg.content})

        # Run through Open Interpreter (this gives sandbox + code execution)
        response = ""
        for chunk in interpreter.chat(conversation, stream=True, display=False):
            if isinstance(chunk, str):
                response += chunk
            # TODO: Handle code blocks and artifacts here

        return {"response": response, "chat_id": request.chat_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
