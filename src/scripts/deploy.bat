@echo off

REM Run the build script
npm run build

REM Check if server is running and stop it
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Stopping existing server...
    taskkill /F /IM node.exe
)

REM Start the server
echo Starting server...
start /B node ../dist/server.js

echo Deployment complete. Server is running.