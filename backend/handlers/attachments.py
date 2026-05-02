from fastapi import APIRouter, UploadFile, File, Form
from pathlib import Path
import base64
import fitz  # PyMuPDF

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

    # Prepare content for oMLX vision
    if file.content_type and file.content_type.startswith("image/"):
        result["content"] = [{
            "type": "image_url",
            "image_url": {"url": f"data:{file.content_type};base64,{base64.b64encode(content).decode()}"}
        }]
    elif file.content_type == "application/pdf":
        doc = fitz.open(stream=content, filetype="pdf")
        result["pages"] = len(doc)
        # Better text preview
        text = "".join([page.get_text()[:500] for page in doc])  # first 500 chars
        result["content"] = [{"type": "text", "text": f"PDF: {file.filename}\n\n{text}..."}]
    else:
        # JSON, Markdown, text
        result["content"] = [{"type": "text", "text": content.decode('utf-8', errors='ignore')}]

    return result
