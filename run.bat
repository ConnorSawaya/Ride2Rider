@echo off
REM Ride2Rider - Windows double-click run
REM Requires Node.js 18+
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)
echo Starting Ride2Rider dev server at http://localhost:5173
call npm run dev
