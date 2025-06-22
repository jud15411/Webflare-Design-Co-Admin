# Production Deployment Script

# Exit on error
$ErrorActionPreference = "Stop"

# Check for required tools
function Check-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check for Node.js and npm
if (-not (Check-Command "node" -or Check-Command "node.exe")) {
    Write-Error "Node.js is not installed. Please install Node.js and try again."
    exit 1
}

if (-not (Check-Command "npm" -or Check-Command "npm.cmd")) {
    Write-Error "npm is not installed. Please install npm and try again."
    exit 1
}

# Check for Firebase CLI
if (-not (Check-Command "firebase")) {
    Write-Error "Firebase CLI is not installed. Please install it with 'npm install -g firebase-tools'"
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

# Build the project
Write-Host "Building project..." -ForegroundColor Cyan
node build.js

# Run tests (if available)
if (Test-Path "test") {
    Write-Host "Running tests..." -ForegroundColor Cyan
    npm test
}

# Deploy to Firebase
Write-Host "Deploying to Firebase..." -ForegroundColor Cyan
firebase deploy --only hosting,firestore:rules,firestore:indexes

# Verify deployment
$deployedUrl = firebase hosting:channel:list --json | ConvertFrom-Json | Select-Object -ExpandProperty result | Select-Object -ExpandProperty channels | Where-Object { $_.name -eq 'live' } | Select-Object -ExpandProperty url

if ($deployedUrl) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "🌐 Your app is live at: $deployedUrl" -ForegroundColor Cyan
    
    # Open in browser
    $openBrowser = Read-Host "Do you want to open the site in your browser? (y/n)"
    if ($openBrowser -eq 'y') {
        Start-Process $deployedUrl
    }
} else {
    Write-Host "⚠️  Deployment might have failed. Please check the logs above." -ForegroundColor Yellow
}

Write-Host "`n🚀 Deployment process completed!" -ForegroundColor Green
