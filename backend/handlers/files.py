# /backend/handlers/files.py
from fastapi import APIRouter
from pathlib import Path

router = APIRouter(prefix="/files")

# Must match SANDBOX_ROOT in chat.py exactly
SANDBOX_ROOT = Path(__file__).parents[2] / "sandbox"

def build_file_tree(root: Path):
    if not root.exists():
        root.mkdir(parents=True, exist_ok=True)
    tree = []
    try:
        for item in sorted(root.iterdir()):
            if item.name.startswith('.'):
                continue
            if item.name == 'session.json':
                continue
            node = {
                "name": item.name,
                "path": str(item.relative_to(root)),
                "isDir": item.is_dir(),
                "size": item.stat().st_size if item.is_file() else None
            }
            if item.is_dir():
                node["children"] = build_file_tree(item)
            tree.append(node)
    except Exception as e:
        print("File tree error:", e)
    return tree

@router.get("/tree")
async def get_file_tree(session_id: str = "default"):
    workspace = SANDBOX_ROOT / session_id
    return build_file_tree(workspace)
