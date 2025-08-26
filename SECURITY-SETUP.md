#  ODIADEV SECURITY CHECKLIST

## CRITICAL SECURITY ACTIONS REQUIRED:

### 1. SET ENVIRONMENT VARIABLES IN VERCEL DASHBOARD
- Go to: https://vercel.com/dashboard/[your-project]/settings/environment-variables
- Add each variable from .env.example with REAL values
- NEVER set real values in .env.example or commit them to Git

### 2. REQUIRED VERCEL ENVIRONMENT VARIABLES:
`
FLW_PUBLIC_KEY=FLWPUBK-[your-real-public-key]-X
FLW_SECRET_KEY=FLWSECK-[your-real-secret-key]-X  
FLW_ENCRYPTION_KEY=[your-real-encryption-key]
FLW_WEBHOOK_SECRET_HASH=[your-real-webhook-hash]
VALID_API_KEYS=odiadev_key_1,[additional-keys]
ODIA_TTS_BASE_URL=[your-real-tts-url]
CORS_ALLOW_ORIGIN=https://odia.dev
`

### 3. SECURITY VERIFICATION:
- [ ] No real API keys in Git repository
- [ ] All secrets set in Vercel dashboard
- [ ] .env file in .gitignore
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced

### 4. GET YOUR REAL FLUTTERWAVE CREDENTIALS:
1. Login to: https://dashboard.flutterwave.com/
2. Navigate to Settings > API Keys
3. Copy your Live/Test keys to Vercel environment variables

##  NEVER COMMIT SECRETS TO GIT!
