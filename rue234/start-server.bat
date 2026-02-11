@echo off
cd /d "%~dp0"
echo Starting server... Open http://localhost:8080 in your browser.
echo Press Ctrl+C to stop.
python -m http.server 8080
if errorlevel 1 (
  echo Python not found. Trying Node...
  npx --yes serve -l 8080
)
pause
