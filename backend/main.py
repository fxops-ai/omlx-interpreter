from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from handlers.attachments import router as attachments_router
from handlers.chat import router as chat_router

app = FastAPI(title="oMLX-Interpreter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attachments_router)
app.include_router(chat_router)

@app.get("/")
async def root():
    return {"status": "oMLX-Interpreter backend running"}
