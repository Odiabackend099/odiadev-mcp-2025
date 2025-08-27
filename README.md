# ODIADEV MCP Server

Nigeria's AI Infrastructure - Model Context Protocol Server

##  Quick Start

### Development
`ash
npm install
vercel dev
`

### Production Deployment
`ash
vercel --prod
`

##  API Endpoints

- **Health Check**: /api/healthcheck
- **Payment Init**: /api/payments/initiate
- **Text-to-Speech**: /api/tts/speak
- **Webhooks**: /api/webhook/flutterwave

##  Environment Setup

1. Copy .env.example to .env
2. Replace all placeholder values with real credentials
3. Set environment variables in Vercel dashboard for production

##  ODIADEV Agents

- **Agent Lexi**: WhatsApp business automation
- **Agent MISS**: University support system
- **Agent Atlas**: Luxury travel management
- **Agent Miss Legal**: Legal document processing

##  Documentation

Visit [docs.odia.dev](https://docs.odia.dev) for complete documentation.

##  Security

- All API endpoints require valid API key
- Environment variables are never committed to repository
- CORS configured for production domains only

---

Built with  for Nigerian businesses by ODIADEV
