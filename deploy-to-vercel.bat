@echo off
REM ODIADEV MCP Server - Complete Deployment Script
REM This script handles the full deployment process including environment variables

echo 🚀 ODIADEV MCP SERVER - PRODUCTION DEPLOYMENT
echo ================================================

echo.
echo 📋 Step 1: Committing latest changes...
git add .
git commit -m "Fix vercel.json and healthcheck syntax - Production ready"
git push origin main

echo.
echo 🔧 Step 2: Setting up production environment variables...

echo   ⚙️ Setting CORS origin...
echo https://mcp.odia.dev | vercel env add CORS_ALLOW_ORIGIN production

echo   ⚙️ Setting Node environment...
echo production | vercel env add NODE_ENV production

echo   ⚙️ Setting API keys (using placeholder - update with real values)...
echo odiadev_production_key_2024,agent_lexi_production_key | vercel env add VALID_API_KEYS production

echo   ⚙️ Setting TTS configuration...
echo https://odiadev-tts-plug-n-play.onrender.com/speak | vercel env add ODIA_TTS_BASE_URL production
echo nigerian-female | vercel env add ODIA_TTS_DEFAULT_VOICE production
echo 30000 | vercel env add ODIA_TTS_TIMEOUT_MS production
echo 500 | vercel env add ODIA_TTS_MAX_TEXT_LENGTH production

echo   ⚙️ Setting rate limiting...
echo 100 | vercel env add RATE_LIMIT_MAX production
echo 60000 | vercel env add RATE_LIMIT_WINDOW production

echo.
echo ⚠️  IMPORTANT: You need to manually set these sensitive variables in Vercel dashboard:
echo   - FLW_SECRET_KEY (Flutterwave Secret Key)
echo   - FLW_PUBLIC_KEY (Flutterwave Public Key) 
echo   - FLW_ENCRYPTION_KEY (Flutterwave Encryption Key)
echo   - FLW_WEBHOOK_SECRET_HASH (Flutterwave Webhook Hash)
echo.
echo 🌐 Visit: https://vercel.com/dashboard/[your-project]/settings/environment-variables
echo.

pause

echo.
echo 🚀 Step 3: Deploying to production...
vercel --prod

echo.
echo ✅ Step 4: Testing deployment...
echo Please test your deployment using:
echo   node verify-production.js https://your-deployment-url.vercel.app
echo.

echo 🎉 DEPLOYMENT COMPLETE!
echo 🇳🇬 Your ODIADEV MCP Server is now live and ready to power Nigeria's AI infrastructure!
echo.
pause