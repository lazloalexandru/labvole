@echo off

REM Create public folder if it doesn't exist
if not exist "public" mkdir public

REM Copy files to public folder
copy index.html public\
copy styles.css public\
copy script.js public\

REM Check if server is running and stop it
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Stopping existing server...
    taskkill /F /IM node.exe
)

REM Start the server
echo Starting server...
start /B node server.js

echo Deployment complete. Server is running.