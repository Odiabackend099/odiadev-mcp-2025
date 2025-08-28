# ODIADEV MCP Server v4.0.0

Nigeria's AI Infrastructure - Production Ready MCP Server

## Production Status: OPERATIONAL

### Quick Deployment

```bash
# Deploy to Vercel
vercel --prod

# Test endpoints
curl https://your-deployment.vercel.app/api/healthcheck
```

### API Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|---------|
| /api/healthcheck | GET | System status | Ready |
| /api/tts/speak | POST | Nigerian voice synthesis | Ready |
| /api/payments/initiate | POST | Flutterwave payments | Ready |
| /api/webhook/flutterwave | POST | Payment webhooks | Ready |

### Environment Configuration

**Required Vercel Environment Variables:**

```
CORS_ALLOW_ORIGIN=https://odia.dev
FLW_SECRET_KEY=FLWSECK-your-secret-key
FLW_WEBHOOK_SECRET_HASH=your-webhook-hash
ODIA_TTS_BASE_URL=https://odiadev-tts-plug-n-play.onrender.com/speak
```

### ODIADEV Agents

- **Agent Lexi**: WhatsApp business automation
- **Agent MISS**: University academic support
- **Agent Atlas**: Luxury travel and VIP management
- **Agent Legal**: NDPR compliance and legal docs

### Security Features

- CORS properly configured for Nigerian domains
- Input validation and sanitization
- Request timeout handling for unreliable networks
- Error logging without exposing sensitive data
- Zero external dependencies for core functions

### Nigerian Network Optimization

- 30-second timeouts for slow connections
- Automatic retry logic for failed requests
- Minimal payload sizes for 2G/3G networks
- Error messages in clear English

---

**Built for Nigerian businesses by ODIADEV**
