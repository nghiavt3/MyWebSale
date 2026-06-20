@echo off
:: Chạy Backend
start /b cmd /c "cd /d C:\Users\vuong\MyWebSales\pos-backend && node server.js"
:: Chạy Frontend
start /b cmd /c "cd /d C:\Users\vuong\MyWebSales\pos-web && npx serve -s build -l 3000"
:: Chạy POSmobile
start /b cmd /c "cd /d C:\Users\vuong\MyWebSales\POSMobile && npx expo start"