#!/usr/bin/env bash
# One-time setup for Mac / Linux.
# Usage:  bash setup.sh
set -e

echo "=== Resume AI setup (Mac/Linux) ==="

# 1. Check Node.js 20+
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed."
  echo "Install Node.js 20 or newer from https://nodejs.org (LTS version), then re-run this script."
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node.js 20+ required, found $(node -v)."
  echo "Update Node.js from https://nodejs.org, then re-run this script."
  exit 1
fi
echo "Node.js $(node -v) OK"

# 2. Ensure pnpm (via corepack, ships with Node — no admin rights needed)
PNPM="pnpm"
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    echo "pnpm not found — using it through corepack (no install needed)."
    PNPM="corepack pnpm"
  else
    echo "Installing pnpm..."
    npm install -g pnpm || { echo "ERROR: could not install pnpm. Try: sudo npm install -g pnpm"; exit 1; }
  fi
fi
echo "pnpm $($PNPM -v) OK"

# 3. Install dependencies
echo "Installing dependencies (this can take a few minutes)..."
$PNPM install

# 4. Create .env.local from template if missing
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local — add your GROQ_API_KEY (free at https://console.groq.com)."
else
  echo ".env.local already exists — leaving it as is."
fi

echo ""
echo "=== Setup complete! ==="
echo "1. Edit .env.local and paste your API key (optional — app works without it)."
echo "2. Start the app:   pnpm dev"
echo "3. Open:            http://localhost:3000"
