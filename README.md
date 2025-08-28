# ODIADEV MCP Server v4.1.0

Nigeria's AI Infrastructure - Production Ready MCP Server

## Quick Deployment

### Deploy to Vercel
`ash
git clone https://github.com/Odiabackend099/odiadev-mcp-server.git
cd odiadev-mcp-server
vercel --prod
`

### Set Environment Variables in Vercel Dashboard
`ash
FLW_SECRET_KEY=FLWSECK-your-secret-key-here
FLW_WEBHOOK_SECRET_HASH=your-webhook-hash
ODIA_TTS_BASE_URL=https://odiadev-tts-plug-n-play.onrender.com/speak
CORS_ALLOW_ORIGIN=https://odia.dev
VALID_API_KEYS=your_api_key_1,your_api_key_2
`

## API Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|---------|
| /api/healthcheck | GET | System health & diagnostics | Ready |
| /api/payments/initiate | POST | Flutterwave payment processing | Ready |
| /api/tts/speak | POST | Nigerian voice text-to-speech | Ready |
| /api/webhook/flutterwave | POST | Payment webhook processing | Ready |

## ODIADEV Agents

- **Agent Lexi**: WhatsApp business automation and customer onboarding
- **Agent MISS**: University academic support for Nigerian institutions  
- **Agent Atlas**: Luxury travel and VIP client management
- **Agent Legal**: NDPR compliance and legal document processing

## Nigerian Network Optimizations

- **3-Retry Logic**: Automatic retries with 250ms/500ms/1000ms delays
- **Timeout Handling**: 30-second timeouts for slow 2G/3G connections
- **Minimal Payloads**: Optimized for limited data plans
- **Network-Friendly**: Works reliably on MTN, Airtel, Glo, and 9mobile

## Security Features

- CORS configured for Nigerian domains
- Input validation and sanitization  
- Request timeout handling
- Error logging without exposing secrets
- API key authentication
- Webhook signature verification

## Local Development

`ash
npm install
vercel dev
`

Test endpoints:
`ash
curl http://localhost:3000/api/healthcheck
`

## Monitoring & Health

The health endpoint provides comprehensive system diagnostics:
- Service status and uptime
- Environment configuration 
- MCP protocol capabilities
- Nigerian network optimizations status

## Production Deployment

1. **Fork this repository**
2. **Set environment variables in Vercel dashboard**
3. **Deploy**: ercel --prod
4. **Test**: Visit https://your-domain.vercel.app/api/healthcheck

## Documentation

- **API Docs**: [docs.odia.dev](https://docs.odia.dev)
- **Support**: [support.odia.dev](https://support.odia.dev)
- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io)

## Company

**ODIADEV** - Building AI infrastructure for Nigerian businesses, universities, and government agencies.

---

**Built with love for Nigeria by ODIADEV Team**

*Empowering African businesses through AI automation*
