# oMLX-Interpreter

**A Claude Chat Pro–style interface — fully local on Apple Silicon.**

oMLX (vision + speed) × Open Interpreter (unrestricted sandbox) × a rich chat UI.  
No cloud. No rate limits. Your files, your models, your machine.

---

## What it is

oMLX-Interpreter combines three things:

- **[oMLX](https://github.com/jundot/omlx)** — a local MLX inference server built for Apple Silicon, with continuous batching, SSD KV-cache persistence, and vision support. Runs models fast enough for real agent workloads.
- **[Open Interpreter](https://github.com/OpenInterpreter/open-interpreter)** — an unrestricted code execution sandbox. The model can read, write, and create files on your real filesystem, run shell commands, and iterate on outputs.
- **A TypeScript/React frontend** — a chat interface styled after Claude.ai, with rich artifact rendering, drag-and-drop attachments, and paste support.

The result: a local AI assistant that can see images, run code, read your PDFs, and write files to disk — with no API costs and nothing leaving your machine.

---

## Features

| Capability | Detail |
|---|---|
| **Vision** | Image understanding via oMLX's VLM support — paste or drop a PNG/JPEG and ask questions about it |
| **Code execution** | Open Interpreter runs Python, shell, and more in a real sandbox — not a simulated one |
| **File I/O** | Reads and writes to your actual filesystem; create, edit, and save files mid-conversation |
| **Attachments** | Drag and drop or paste: PDF, JSON, Markdown, PNG, JPEG |
| **Streaming** | Token-by-token streaming responses from the backend |
| **Artifacts** | Rich rendering of code blocks, markdown, and structured output in the UI |
| **Fully local** | oMLX runs on-device; no API keys, no data leaving your Mac |

---

## Requirements

- Apple Silicon Mac (M1 or later)
- macOS 13 Ventura or later
- [oMLX](https://github.com/jundot/omlx) installed and running (see below)
- Python 3.11+
- Node.js 18+

---

## Quick Start

### 1. Install and start oMLX

Download the `.dmg` from [oMLX Releases](https://github.com/jundot/omlx/releases), drag to Applications, and launch it. oMLX serves on `http://localhost:8000/v1` by default.

Or via Homebrew:

```bash
brew tap jundot/omlx https://github.com/jundot/omlx
brew install omlx
brew services start omlx
```

Download at least one model via the oMLX admin UI at `http://localhost:8000/admin`.

### 2. Clone and set up oMLX-Interpreter

```bash
git clone https://github.com/fxops-ai/omlx-interpreter.git
cd omlx-interpreter
./setup.sh
```

`setup.sh` installs Python dependencies (including Open Interpreter) and Node packages.

### 3. Start the backend

```bash
cd backend
uvicorn main:app --reload --port 8001
```

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** — you're live.

---

## Project Structure

```
omlx-interpreter/
├── backend/          # Python — FastAPI server, Open Interpreter integration
│   └── main.py       # API routes, streaming, oMLX proxy, file handling
├── frontend/         # TypeScript/React — chat UI, artifact renderer, attachment handling
├── setup.sh          # One-shot install script
├── .gitignore
└── LICENSE           # MIT
```

**Language breakdown:** ~60% TypeScript (frontend), ~39% Python (backend).

---

## How It Works

```
Browser (localhost:3000)
        ↕  HTTP / SSE streaming
FastAPI backend (localhost:8001)
        ↕  Open Interpreter (code execution, filesystem)
        ↕  oMLX API (localhost:8000/v1)
                ↕  Local model weights (MLX, Apple Silicon)
```

The backend acts as an orchestration layer: it routes messages to oMLX for generation, passes code blocks to Open Interpreter for execution, handles file attachment parsing, and streams everything back to the frontend in real time.

---

## Configuration

By default the backend expects oMLX at `http://localhost:8000`. To point it at a different host or port, set the environment variable before starting:

```bash
OMLX_BASE_URL=http://localhost:8000 uvicorn main:app --reload --port 8001
```

Model selection is handled through the oMLX admin interface at `http://localhost:8000/admin`. Can also be selected in the chat interface at the user prompt.

---

## Status

**MVP — active development.**

Core chat loop, streaming, attachments, vision, and code execution are working. The interface matches the intended Claude Chat Pro aesthetic. Rough edges remain — error handling, session persistence, and model switching are still being refined.

If you hit a bug or want to contribute, open an issue.

---

## Related

- [oMLX](https://github.com/jundot/omlx) — the inference engine this is built on
- [Open Interpreter](https://github.com/OpenInterpreter/open-interpreter) — the code execution layer

---

## License

MIT — see [LICENSE](LICENSE).

<img width="1207" height="1072" alt="Screenshot 2026-05-02 at 9 57 40 PM" src="https://github.com/user-attachments/assets/6ef38d22-6423-4336-8c94-b83a04edc171" />
<img width="1207" height="1072" alt="Screenshot 2026-05-02 at 9 58 41 PM" src="https://github.com/user-attachments/assets/46db7d6a-98f9-4bf9-acd6-44c367689ccc" />

