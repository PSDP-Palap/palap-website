# Check for npm
$npmCheck = Get-Command npm -ErrorAction SilentlyContinue

if ($null -eq $npmCheck) {
    Write-Host "--- [ERROR] npm not found! ---" -ForegroundColor Red
    Write-Host "Opening Node.js download page..." -ForegroundColor Yellow
    Start-Process "https://nodejs.org/"
    Write-Host "Please install Node.js and run this script again." -ForegroundColor Cyan
} else {
    Write-Host "--- [SUCCESS] npm version: $(npm -v) ---" -ForegroundColor Green
    
    # Check for package.json
    if (!(Test-Path "package.json")) {
        Write-Host "No package.json found. Initializing..." -ForegroundColor Cyan
        npm init -y
    }

    # Install react-router-dom
    Write-Host "Installing react-router-dom..." -ForegroundColor Cyan
    npm install react-router-dom
    
    Write-Host "--- ALL DONE! ---" -ForegroundColor Green
}