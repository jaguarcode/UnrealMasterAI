/**
 * Zod schemas for WebSocket protocol validation.
 */
import { z } from 'zod';

export const WSMessageSchema = z.object({
  id: z.string().uuid(),
  method: z.string().regex(/^[a-z]+\.[a-zA-Z]+$/),
  params: z.record(z.unknown()),
  timestamp: z.number().int().positive(),
});

export const WSErrorSchema = z.object({
  code: z.number().int().min(1000).max(7599),
  message: z.string(),
  data: z.unknown().optional(),
});

export const WSResponseSchema = z.object({
  id: z.string().uuid(),
  result: z.unknown().optional(),
  error: WSErrorSchema.optional(),
  duration_ms: z.number().min(0),
});

export type WSMessageInput = z.input<typeof WSMessageSchema>;
export type WSResponseInput = z.input<typeof WSResponseSchema>;
