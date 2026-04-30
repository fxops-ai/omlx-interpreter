from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from handlers.attachments import router as attachments_router

app = FastAPI(title="oMLX-Interpreter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attachments_router)

@app.get("/")
async def root():
    return {"status": "oMLX-Interpreter backend is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
