@echo off
setlocal
cd /d "%~dp0"
echo.
echo ========================================
echo        ATTENDLY - SCHOOL MANAGER
 echo ========================================
echo Starting backend on port 5000-5002...
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  echo Install Node.js and run this file again.
  pause
  exit /b 1
)
start "Attendly Server" cmd /k "cd /d %~dp0 && npm start"
timeout /t 2 /nobreak >nul
start "" http://localhost:5000
endlocal
