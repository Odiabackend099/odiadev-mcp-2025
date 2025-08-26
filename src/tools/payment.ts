import { z } from 'zod';
import crypto from 'crypto';

const paymentSchema = z.object({
  amount: z.number().positive().max(10000000), // Max 10M NGN
  currency: z.string().default('NGN'),
  customer: z.object({
    email: z.string().email(),
    name: z.string().min(2).max(100)
  }),
  tx_ref: z.string().min(6).max(50),
  redirect_url: z.string().url().optional(),
  meta: z.record(z.any()).optional()
});

export const paymentTool = {
  title: 'Initiate Payment',
  description: 'Initialize a Flutterwave payment transaction for Nigerian businesses',
  inputSchema: paymentSchema,
  handler: async (input: z.infer<typeof paymentSchema>) => {
    const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY!;
    
    try {
      const payload = {
        ...input,
        currency: input.currency || 'NGN',
        meta: {
          ...input.meta,
          odia_agent: 'lexi',
          source: 'mcp_server',
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': Bearer 
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(Flutterwave API error: );
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            payment_link: data.data?.link,
            transaction_id: data.data?.id,
            reference: input.tx_ref,
            amount: input.amount,
            currency: input.currency,
            status: 'pending'
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Payment initiation failed',
            reference: input.tx_ref
          }, null, 2)
        }]
      };
    }
  }
};
