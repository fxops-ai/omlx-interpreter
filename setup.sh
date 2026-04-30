#!/bin/bash
echo "🚀 Setting up oMLX-Interpreter..."

cd backend
pip install -e .

echo ""
echo "✅ Backend installed!"
echo "Run: uvicorn main:app --reload --port 8001"
echo ""
echo "Make sure oMLX is running on http://localhost:8000"
