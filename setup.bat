@echo off
REM One-time setup for Windows.
REM Usage: double-click this file, or run "setup.bat" in Command Prompt.
setlocal enabledelayedexpansion

echo === Resume AI setup (Windows) ===

REM 1. Check Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install Node.js 20 or newer from https://nodejs.org ^(LTS version^), then re-run this script.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 20 (
  echo ERROR: Node.js 20+ required, found:
  node -v
  echo Update Node.js from https://nodejs.org, then re-run this script.
  pause
  exit /b 1
)
echo Node.js OK:
node -v

REM 2. Ensure pnpm (via corepack, ships with Node — no admin rights needed)
set PNPM=pnpm
where pnpm >nul 2>nul
if errorlevel 1 (
  where corepack >nul 2>nul
  if errorlevel 1 (
    echo Installing pnpm...
    call npm install -g pnpm
  ) else (
    echo pnpm not found — using it through corepack ^(no install needed^).
    set PNPM=corepack pnpm
  )
)
echo pnpm OK:
call %PNPM% -v

REM 3. Install dependencies
echo Installing dependencies ^(this can take a few minutes^)...
call %PNPM% install
if errorlevel 1 (
  echo ERROR: pnpm install failed. Check your internet connection and re-run.
  pause
  exit /b 1
)

REM 4. Create .env.local from template if missing
if not exist .env.local (
  copy .env.example .env.local >nul
  echo Created .env.local — add your GROQ_API_KEY ^(free at https://console.groq.com^).
) else (
  echo .env.local already exists — leaving it as is.
)

echo.
echo === Setup complete! ===
echo 1. Edit .env.local and paste your API key ^(optional — app works without it^).
echo 2. Start the app:   pnpm dev
echo 3. Open:            http://localhost:3000
pause
