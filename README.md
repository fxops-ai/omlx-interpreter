# oMLX-Interpreter

**Claude Chat Pro — fully local on Apple Silicon.**

oMLX (speed + vision) + Open Interpreter (full sandbox) + rich chat UI.

## Quick Start

```bash
# 1. Clone & setup
cd ~/Documents/Projects/omlx-interpreter
./setup.sh

# 2. Start backend
cd backend && uvicorn main:app --reload --port 8001

# 3. Start frontend (new terminal)
cd frontend && npm install && npm run dev
Open http://localhost:3000
Features

Full drag & drop + paste support (PDF, JSON, MD, PNG, JPEG)
Vision support via oMLX
Real filesystem sandbox (read/write/create)
Streaming responses

Status: MVP in progress
