# /backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from handlers.attachments import router as attachments_router
from handlers.chat import router as chat_router
from handlers.files import router as files_router   # ← NEW

app = FastAPI(title="oMLX-Interpreter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attachments_router)
app.include_router(chat_router)
app.include_router(files_router)

@app.get("/")
async def root():
    return {"status": "oMLX-Interpreter backend running on port 8002"}

@app.get("/debug/routes")
async def debug_routes():
    return {"routes": [str(route) for route in app.routes]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, reload=True)