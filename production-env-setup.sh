#!/bin/bash
# ODIADEV MCP Server - Production Environment Setup
# Sets up all required environment variables for Vercel deployment

echo "🚀 ODIADEV MCP Server - Production Environment Setup"
echo "=" | tr -d '\n' | head -c 50 && echo

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Please install it first:${NC}"
    echo "npm install -g vercel"
    exit 1
fi

echo -e "${GREEN}✅ Vercel CLI found${NC}"

# Get project directory
PROJECT_DIR=$(pwd)
echo -e "${BLUE}📁 Project Directory: ${PROJECT_DIR}${NC}"

# Check if this is a Vercel project
if [ ! -f ".vercel/project.json" ]; then
    echo -e "${YELLOW}⚠️  Not linked to Vercel project yet. Please run 'vercel' first to link.${NC}"
    echo -e "${BLUE}ℹ️  This script will continue and set up environment variables for when you link.${NC}"
fi

echo
echo "🔧 Setting up environment variables..."
echo "Enter your production values (or press Enter to skip):"
echo

# Function to set environment variable
set_env_var() {
    local var_name=$1
    local description=$2
    local is_secret=${3:-true}
    
    echo
    echo -e "${BLUE}📝 ${var_name}${NC}"
    echo -e "${YELLOW}   ${description}${NC}"
    
    if [ "$is_secret" = true ]; then
        read -s -p "   Value: " var_value
        echo
    else
        read -p "   Value: " var_value
    fi
    
    if [ ! -z "$var_value" ]; then
        echo "$var_name=\"$var_value\"" >> .env.production
        echo -e "${GREEN}   ✅ Added to .env.production${NC}"
        
        # Also try to set in Vercel if project is linked
        if [ -f ".vercel/project.json" ]; then
            vercel env add "$var_name" production 2>/dev/null && \
            echo -e "${GREEN}   ✅ Added to Vercel${NC}" || \
            echo -e "${YELLOW}   ⚠️  Could not add to Vercel (run 'vercel env add $var_name production' manually)${NC}"
        fi
    else
        echo -e "${YELLOW}   ⏭️  Skipped${NC}"
    fi
}

# Create/clear production env file
echo "# ODIADEV MCP Server - Production Environment Variables" > .env.production
echo "# Generated on $(date)" >> .env.production
echo "" >> .env.production

# Set up all required environment variables
set_env_var "FLW_SECRET_KEY" "Flutterwave Secret Key (FLWSECK-...)" true
set_env_var "FLW_PUBLIC_KEY" "Flutterwave Public Key (FLWPUBK-...)" false
set_env_var "FLW_ENCRYPTION_KEY" "Flutterwave Encryption Key" true
set_env_var "FLW_WEBHOOK_SECRET_HASH" "Flutterwave Webhook Secret Hash" true
set_env_var "VALID_API_KEYS" "Comma-separated API keys (e.g., odiadev_key1,agent_lexi_key2)" true
set_env_var "ODIA_TTS_BASE_URL" "TTS Service URL (default: https://odiadev-tts-plug-n-play.onrender.com/speak)" false
set_env_var "CORS_ALLOW_ORIGIN" "CORS Origin (default: https://mcp.odia.dev)" false

echo
echo "🔒 Setting standard production variables..."

# Set standard production variables
echo "NODE_ENV=\"production\"" >> .env.production
echo "RATE_LIMIT_MAX=\"100\"" >> .env.production
echo "RATE_LIMIT_WINDOW=\"60000\"" >> .env.production
echo "ODIA_TTS_DEFAULT_VOICE=\"nigerian-female\"" >> .env.production
echo "ODIA_TTS_TIMEOUT_MS=\"30000\"" >> .env.production
echo "ODIA_TTS_MAX_TEXT_LENGTH=\"500\"" >> .env.production

echo -e "${GREEN}✅ Standard variables added${NC}"

# Set Vercel environment variables if project is linked
if [ -f ".vercel/project.json" ]; then
    echo
    echo "🚀 Setting Vercel environment variables..."
    
    vercel env add NODE_ENV production <<< "production" 2>/dev/null
    vercel env add RATE_LIMIT_MAX production <<< "100" 2>/dev/null
    vercel env add RATE_LIMIT_WINDOW production <<< "60000" 2>/dev/null
    vercel env add ODIA_TTS_DEFAULT_VOICE production <<< "nigerian-female" 2>/dev/null
    vercel env add ODIA_TTS_TIMEOUT_MS production <<< "30000" 2>/dev/null
    vercel env add ODIA_TTS_MAX_TEXT_LENGTH production <<< "500" 2>/dev/null
    
    echo -e "${GREEN}✅ Standard Vercel variables set${NC}"
fi

echo
echo "=" | tr -d '\n' | head -c 50 && echo
echo -e "${GREEN}🎉 PRODUCTION SETUP COMPLETE!${NC}"
echo
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Review .env.production file for accuracy"
echo "2. If not linked yet: Run 'vercel' to link to your project"
echo "3. If missing variables: Run 'vercel env add VARIABLE_NAME production'"
echo "4. Deploy: 'vercel --prod'"
echo "5. Test: 'node verify-production.js https://your-deployment.vercel.app'"
echo
echo -e "${YELLOW}⚠️  Security Note:${NC}"
echo "• .env.production contains sensitive data - do not commit to git"
echo "• Verify all secrets are properly set in Vercel dashboard"
echo "• Test the deployment before announcing live status"
echo

if [ -f ".env.production" ]; then
    echo -e "${BLUE}📄 Generated .env.production with $(wc -l < .env.production) lines${NC}"
fi

echo -e "${GREEN}🇳🇬 Ready to power Nigeria's AI infrastructure! 🚀${NC}"