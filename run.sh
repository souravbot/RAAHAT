#!/bin/bash
# RAAHAT — One-command startup script for backend & frontend
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🚀 Starting RAAHAT (FastAPI Backend + Vite Frontend)..."
npm run dev
