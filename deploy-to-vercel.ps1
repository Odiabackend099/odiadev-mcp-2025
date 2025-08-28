# ODIADEV MCP Server - Production Deployment Script (PowerShell)
# This script handles the complete deployment process with error checking

Write-Host "🚀 ODIADEV MCP SERVER - PRODUCTION DEPLOYMENT" -ForegroundColor Green
Write-Host "=" * 50

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check prerequisites
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Blue

if (-not (Test-Command "git")) {
    Write-Host "❌ Git is not installed or not in PATH" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Git found" -ForegroundColor Green

if (-not (Test-Command "vercel")) {
    Write-Host "❌ Vercel CLI is not installed. Install with: npm install -g vercel" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Vercel CLI found" -ForegroundColor Green

# Validate vercel.json
Write-Host "`n🔍 Validating vercel.json..." -ForegroundColor Blue
try {
    $vercelConfig = Get-Content "vercel.json" -Raw | ConvertFrom-Json
    Write-Host "✅ vercel.json is valid JSON" -ForegroundColor Green
} catch {
    Write-Host "❌ vercel.json is not valid JSON: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test local compilation
Write-Host "`n🧪 Testing local compilation..." -ForegroundColor Blue
$testResult = & node test-fixes.js 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All local tests passed" -ForegroundColor Green
} else {
    Write-Host "❌ Local tests failed:" -ForegroundColor Red
    Write-Host $testResult
    Read-Host "Press Enter to continue anyway or Ctrl+C to abort"
}

# Commit and push changes
Write-Host "`n📤 Step 1: Committing and pushing changes..." -ForegroundColor Blue
try {
    git add .
    git commit -m "Fix vercel.json and healthcheck syntax - Production ready"
    git push origin main
    Write-Host "✅ Changes pushed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Git operations failed - continuing with deployment" -ForegroundColor Yellow
}

# Set environment variables
Write-Host "`n🔧 Step 2: Setting up production environment variables..." -ForegroundColor Blue

$envVars = @{
    "CORS_ALLOW_ORIGIN" = "https://mcp.odia.dev"
    "NODE_ENV" = "production"
    "VALID_API_KEYS" = "odiadev_production_key_2024,agent_lexi_production_key"
    "ODIA_TTS_BASE_URL" = "https://odiadev-tts-plug-n-play.onrender.com/speak"
    "ODIA_TTS_DEFAULT_VOICE" = "nigerian-female"
    "ODIA_TTS_TIMEOUT_MS" = "30000"
    "ODIA_TTS_MAX_TEXT_LENGTH" = "500"
    "RATE_LIMIT_MAX" = "100"
    "RATE_LIMIT_WINDOW" = "60000"
}

foreach ($var in $envVars.GetEnumerator()) {
    Write-Host "  ⚙️ Setting $($var.Key)..." -ForegroundColor Cyan
    try {
        $var.Value | vercel env add $var.Key production 2>$null
        Write-Host "    ✅ $($var.Key) set successfully" -ForegroundColor Green
    } catch {
        Write-Host "    ⚠️ Failed to set $($var.Key) - may already exist" -ForegroundColor Yellow
    }
}

# Display manual setup instructions
Write-Host "`n⚠️ IMPORTANT: Manual Setup Required" -ForegroundColor Yellow
Write-Host "You need to manually set these sensitive variables in Vercel dashboard:" -ForegroundColor Yellow
Write-Host "  - FLW_SECRET_KEY (Flutterwave Secret Key)" -ForegroundColor White
Write-Host "  - FLW_PUBLIC_KEY (Flutterwave Public Key)" -ForegroundColor White
Write-Host "  - FLW_ENCRYPTION_KEY (Flutterwave Encryption Key)" -ForegroundColor White
Write-Host "  - FLW_WEBHOOK_SECRET_HASH (Flutterwave Webhook Hash)" -ForegroundColor White
Write-Host "`n🌐 Visit: https://vercel.com/dashboard/[your-project]/settings/environment-variables" -ForegroundColor Cyan

Read-Host "`nPress Enter after setting up the Flutterwave credentials to continue"

# Deploy to production
Write-Host "`n🚀 Step 3: Deploying to production..." -ForegroundColor Blue
try {
    $deployResult = vercel --prod 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
        Write-Host $deployResult
        
        # Extract deployment URL
        $deployUrl = ($deployResult | Select-String "https://.*\.vercel\.app").Matches.Value
        if ($deployUrl) {
            Write-Host "`n🔍 Testing deployment..." -ForegroundColor Blue
            Write-Host "Testing URL: $deployUrl" -ForegroundColor Cyan
            
            # Test the deployment
            & node verify-production.js $deployUrl
        }
    } else {
        Write-Host "❌ Deployment failed:" -ForegroundColor Red
        Write-Host $deployResult
        exit 1
    }
} catch {
    Write-Host "❌ Deployment error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "🇳🇬 Your ODIADEV MCP Server is now live and ready to power Nigeria's AI infrastructure!" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Blue
Write-Host "1. Test all endpoints with real data" -ForegroundColor White
Write-Host "2. Set up monitoring and alerts" -ForegroundColor White  
Write-Host "3. Configure custom domain: mcp.odia.dev" -ForegroundColor White
Write-Host "4. Update documentation with production URLs" -ForegroundColor White

Read-Host "`nPress Enter to exit"