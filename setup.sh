#!/bin/bash
echo "🚀 Setting up oMLX-Interpreter..."

# Check Python 3.13+
PYTHON=$(command -v python3.13 || command -v python3)
PY_VERSION=$($PYTHON -c 'import sys; print(sys.version_info[:2])')
if [[ "$PY_VERSION" < "(3, 13)" ]]; then
    echo "❌ Python 3.13 or later is required. Found: $($PYTHON --version)"
    exit 1
fi
echo "✅ Python: $($PYTHON --version)"

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

# Install Rust if missing (required by some Open Interpreter dependencies)
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# Install Python backend dependencies
echo ""
echo "Installing backend dependencies..."
cd backend
pip install -e .
cd ..

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps
cd ..

echo ""
echo "✅ Setup complete."
echo ""
echo "Make sure oMLX is running on http://localhost:8000"
echo ""
echo "Start backend  →  cd backend && uvicorn main:app --host 127.0.0.1 --port 8002 --reload"
echo "Start frontend →  cd frontend && npm run dev"
echo ""
echo "Frontend will be available at http://localhost:3010"
