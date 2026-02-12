@echo off
cd /d "%~dp0"
echo Starting server... Open http://localhost:5500 in your browser.
echo Press Ctrl+C to stop.
python -m http.server 5500
if errorlevel 1 (
  echo Python not found. Trying Node...
  npx --yes serve -l 5500
)
pause
