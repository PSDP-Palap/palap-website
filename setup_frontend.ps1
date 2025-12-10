# 1. เช็คสิทธิ์การรันสคริปต์เบื้องต้น
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

Write-Host "--- Checking Environment ---" -ForegroundColor Cyan

# 2. เช็ค npm แบบใช้ try-catch เพื่อความชัวร์
try {
    $npmVer = npm -v
    Write-Host "--- [SUCCESS] npm version: $npmVer ---" -ForegroundColor Green
} catch {
    Write-Host "--- [ERROR] npm not found! ---" -ForegroundColor Red
    Write-Host "Opening Node.js download page..." -ForegroundColor Yellow
    Start-Process "https://nodejs.org/"
    return # หยุดการทำงาน
}

# 3. เช็คว่าอยู่ในโฟลเดอร์โปรเจกต์ไหม
if (!(Test-Path "package.json")) {
    Write-Host "No package.json found. Creating new project..." -ForegroundColor Yellow
    npm init -y
} else {
    Write-Host "Found existing package.json" -ForegroundColor Green
}

# 4. ติดตั้ง react-router-dom
Write-Host "Installing react-router-dom... Please wait." -ForegroundColor Cyan
npm install react-router-dom

# 5. สรุปผล
if ($?) {
    Write-Host "--- [ALL DONE] Everything is ready! ---" -ForegroundColor Green
    Write-Host "You can now use 'import { useNavigate } from ""react-router-dom"";' in your code." -ForegroundColor White
} else {
    Write-Host "--- [FAILED] Something went wrong during installation ---" -ForegroundColor Red
}