import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger, format, transports } from 'winston';
import { paymentTool } from './tools/payment.js';
import { ttsTool } from './tools/tts.js';
import { healthTool } from './tools/health.js';

// Enhanced logging
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});

// Environment validation
const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  FLW_SECRET_KEY: z.string().min(1, 'FLW_SECRET_KEY required'),
  FLW_WEBHOOK_SECRET_HASH: z.string().min(1, 'FLW_WEBHOOK_SECRET_HASH required'),
  FLW_ENCRYPTION_KEY: z.string().min(1, 'FLW_ENCRYPTION_KEY required'),
  VALID_API_KEYS: z.string().min(1, 'VALID_API_KEYS required'),
  ODIA_TTS_BASE_URL: z.string().url('ODIA_TTS_BASE_URL must be valid URL'),
  CORS_ALLOW_ORIGIN: z.string().url().default('https://odia.dev')
});

let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse(process.env);
  logger.info('Environment validation passed');
} catch (error) {
  logger.error('Environment validation failed:', error);
  process.exit(1);
}

class OdiaAIMCPServer {
  private server: McpServer;
  private app: express.Application;

  constructor() {
    // Create MCP Server with proper capabilities
    this.server = new McpServer(
      {
        name: 'odiadev-mcp-server',
        version: '3.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    // Setup Express app for HTTP transport
    this.app = express();
    this.setupMiddleware();
    this.setupTools();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // Body parser with size limits
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CORS
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', env.CORS_ALLOW_ORIGIN);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private setupTools() {
    // Register MCP tools
    this.server.registerTool('payment_initiate', paymentTool);
    this.server.registerTool('text_to_speech', ttsTool);
    this.server.registerTool('health_check', healthTool);

    logger.info('MCP tools registered successfully');
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'ODIADEV MCP Server',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        mcp: {
          protocol: '2024-11-05',
          capabilities: ['tools', 'resources', 'prompts']
        }
      });
    });

    // MCP endpoint for HTTP transport
    this.app.all('/mcp', async (req, res) => {
      const sessionId = req.headers['x-session-id'] as string || 'default';
      
      try {
        const transport = new StreamableHTTPServerTransport(req, res);
        await this.server.connect(transport);
        logger.info('MCP client connected', { sessionId });
      } catch (error) {
        logger.error('MCP connection error:', error);
        res.status(500).json({ error: 'MCP connection failed' });
      }
    });

    // Error handling middleware
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Express error:', error);
      res.status(500).json({
        error: 'Internal server error',
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    });
  }

  async start(transport: 'stdio' | 'http' = 'stdio') {
    if (transport === 'stdio') {
      const stdioTransport = new StdioServerTransport();
      await this.server.connect(stdioTransport);
      logger.info('MCP server started with stdio transport');
    } else {
      const port = process.env.PORT || 3000;
      this.app.listen(port, () => {
        logger.info(ODIADEV MCP Server listening on port );
      });
    }
  }
}

// Start server
const server = new OdiaAIMCPServer();

if (process.argv[1] === import.meta.url.replace('file://', '')) {
  server.start().catch((error) => {
    logger.error('Server startup failed:', error);
    process.exit(1);
  });
}

export default OdiaAIMCPServer;
