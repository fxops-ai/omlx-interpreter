#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV="$ROOT/.venv"
PYTHON="$(command -v python3.13 || command -v python3)"

echo "🚀 Setting up oMLX-Interpreter..."

# Check Python 3.13+
PY_VERSION=$("$PYTHON" -c 'import sys; print("%d.%d" % sys.version_info[:2])')
"$PYTHON" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 13) else 1)' || {
    echo "❌ Python 3.13 or later is required. Found: $($PYTHON --version)"
    exit 1
}
echo "✅ Python: $($PYTHON --version)"

# Isolated venv — never install into system/user site-packages
if [[ ! -d "$VENV" ]]; then
    echo "Creating virtualenv at .venv (isolated from system Python)..."
    "$PYTHON" -m venv "$VENV"
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate"
echo "✅ venv: $(python -c 'import sys; print(sys.prefix)')"

python -m pip install --upgrade pip

# Check for port conflict on 8002
if lsof -i :8002 -sTCP:LISTEN &> /dev/null; then
    echo ""
    echo "⚠️  Port 8002 is already in use:"
    lsof -i :8002 -sTCP:LISTEN
    echo ""
    read -p "Kill existing process and continue? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti :8002 -sTCP:LISTEN | xargs kill -9
        echo "✅ Port 8002 cleared."
    else
        echo "Exiting. Stop the existing process manually and re-run setup."
        exit 1
    fi
fi

# Install Python backend dependencies into the venv only.
# Never pip-install into system site-packages.
# Open Interpreter 0.4.3's PyPI metadata pins tiktoken<0.8 and starlette<0.38,
# which conflict with Python 3.13 wheels and FastAPI 0.136. Install our stack
# first, then overlay OI with --no-deps plus its remaining runtime packages.
echo ""
echo "Installing backend (FastAPI, litellm, pymupdf, tiktoken 0.12, …) into .venv..."
python -m pip install -e "$ROOT/backend"
# OI 0.4.3 declares tiktoken<0.8 / starlette<0.38. Those pins have no Python 3.13
# wheels and conflict with this app. Install the PyPI wheel with --no-deps, then
# its remaining runtime packages (tiktoken 0.12 already present from backend).
echo "Installing open-interpreter==0.4.3 (PyPI, --no-deps overlay)..."
python -m pip install "open-interpreter==0.4.3" --no-deps
python -m pip install \
    "anthropic>=0.37.1,<0.38.0" \
    "astor>=0.8.1,<0.9.0" \
    "git-python>=1.0.3,<2.0.0" \
    "google-generativeai>=0.7.1,<0.8.0" \
    "html2image>=2.0.4.3,<3.0.0.0" \
    "html2text>=2024.2.26,<2025.0.0" \
    "inquirer>=3.1.3,<4.0.0" \
    "ipykernel>=6.26.0,<7.0.0" \
    "jupyter-client>=8.6.0,<9.0.0" \
    "matplotlib>=3.8.2,<4.0.0" \
    "nltk>=3.8.1,<4.0.0" \
    "platformdirs>=4.2.0,<5.0.0" \
    "psutil>=5.9.6,<6.0.0" \
    "pyperclip>=1.9.0,<2.0.0" \
    "pyyaml>=6.0.1,<7.0.0" \
    "rich>=13.4.2,<14.0.0" \
    "selenium>=4.24.0,<5.0.0" \
    "send2trash>=1.8.2,<2.0.0" \
    "shortuuid>=1.0.13,<2.0.0" \
    "six>=1.16.0,<2.0.0" \
    "toml" \
    "webdriver-manager" \
    "wget" \
    "yaspin" \
    "setuptools==77.0.3"
python -m pip install tokentrim --no-deps

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
(cd "$ROOT/frontend" && npm install --legacy-peer-deps)

echo ""
echo "✅ Setup complete."
echo ""
echo "Make sure oMLX is running on http://localhost:8001"
echo ""
echo "Activate venv  →  source .venv/bin/activate"
echo "Start backend  →  source .venv/bin/activate && cd backend && uvicorn main:app --host 127.0.0.1 --port 8002 --reload"
echo "Start frontend →  cd frontend && npm run dev"
echo ""
echo "Frontend will be available at http://localhost:3010"
