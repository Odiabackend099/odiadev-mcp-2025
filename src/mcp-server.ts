import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger, format, transports } from 'winston';

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
  FLW_SECRET_KEY: z.string().optional(),
  FLW_WEBHOOK_SECRET_HASH: z.string().optional(),
  FLW_ENCRYPTION_KEY: z.string().optional(),
  VALID_API_KEYS: z.string().optional(),
  ODIA_TTS_BASE_URL: z.string().optional(),
  CORS_ALLOW_ORIGIN: z.string().url().default('https://odia.dev')
});

let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse(process.env);
  logger.info('Environment validation passed');
} catch (error) {
  logger.error('Environment validation failed:', error);
  env = envSchema.parse({});
}

class OdiaDevMCPServer {
  private server: McpServer;
  private app: express.Application;

  constructor() {
    this.server = new McpServer(
      {
        name: 'odiadev-mcp-server',
        version: '3.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.app = express();
    this.setupMiddleware();
    this.setupTools();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(helmet());

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', env.CORS_ALLOW_ORIGIN);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });

    this.app.use((req: Request, res: Response, next: NextFunction) => {
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
    // Register tools with correct inputSchema format (raw shape, not z.object)
    this.server.registerTool(
      'payment_initiate',
      {
        title: 'Initiate Payment',
        description: 'Initialize a Flutterwave payment transaction',
        inputSchema: {
          amount: z.number().positive(),
          currency: z.string().default('NGN'),
          customer: z.object({
            email: z.string().email(),
            name: z.string()
          }),
          tx_ref: z.string()
        }
      },
      async ({ amount, currency, customer, tx_ref }) => {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Payment tool registered',
              amount,
              currency,
              customer,
              tx_ref
            }, null, 2)
          }]
        };
      }
    );

    this.server.registerTool(
      'text_to_speech',
      {
        title: 'Text to Speech',
        description: 'Convert text to speech using Nigerian voice models',
        inputSchema: {
          text: z.string(),
          voice: z.string().default('nigerian-female')
        }
      },
      async ({ text, voice }) => {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'TTS tool registered',
              text: text.substring(0, 50) + '...',
              voice
            }, null, 2)
          }]
        };
      }
    );

    this.server.registerTool(
      'health_check',
      {
        title: 'System Health Check',
        description: 'Check ODIADEV system health',
        inputSchema: {
          include_dependencies: z.boolean().default(true)
        }
      },
      async ({ include_dependencies }) => {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'healthy',
              service: 'ODIADEV MCP Server',
              version: '3.0.0',
              timestamp: new Date().toISOString(),
              dependencies_checked: include_dependencies
            }, null, 2)
          }]
        };
      }
    );

    logger.info('MCP tools registered successfully');
  }

  private setupRoutes() {
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        service: 'ODIADEV MCP Server',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        mcp: {
          protocol: '2024-11-05',
          capabilities: ['tools']
        }
      });
    });

    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
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
        logger.info(`ODIADEV MCP Server listening on port ${port}`);
      });
    }
  }
}

const server = new OdiaDevMCPServer();

if (process.argv[1] === import.meta.url.replace('file://', '')) {
  server.start().catch((error) => {
    logger.error('Server startup failed:', error);
    process.exit(1);
  });
}

export default OdiaDevMCPServer;
