@echo off
set ROOT=%~dp0
echo ⏳ Dang khoi dong he thong POS...

:: 1. Khoi dong MySQL Portable
start "" "%ROOT%mysql\mysql-9.5.0-winx64\bin\mysqld.exe" --defaults-file="%ROOT%mysql\mysql-9.5.0-winx64\my.ini" --console

:: 2. Doi vai giay cho MySQL san sang
timeout /t 5

:: 3. Khoi dong Backend bang Node Portable
start "" "%ROOT%node\node-v20.15.0-win-x64\node.exe" "%ROOT%pos-backend\server.js"

:: 4. Mo trinh duyet
timeout /t 3
start http://localhost:5000
echo ✅ He thong da san sang!