from fastapi import APIRouter, UploadFile, File, Form
from pathlib import Path
import base64
import fitz  # PyMuPDF for PDFs

router = APIRouter(prefix="/attachments")

SANDBOX_ROOT = Path("~/.omlxi/workspaces").expanduser()

@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    chat_id: str = Form("default")
):
    workspace = SANDBOX_ROOT / chat_id
    workspace.mkdir(parents=True, exist_ok=True)
    
    file_path = workspace / file.filename
    content = await file.read()
    file_path.write_bytes(content)

    result = {
        "filename": file.filename,
        "path": str(file_path),
        "size": len(content),
        "type": file.content_type or "unknown"
    }

    # Special handling for different file types
    if file.content_type and file.content_type.startswith("image/"):
        result["base64"] = base64.b64encode(content).decode()
    elif file.content_type == "application/pdf":
        # Convert PDF pages to images for oMLX vision
        doc = fitz.open(stream=content, filetype="pdf")
        result["pages"] = len(doc)
    
    return result
