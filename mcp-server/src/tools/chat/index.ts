import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { chatSendMessage } from './send-message.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'chat-sendMessage',
      description: 'Send a message through the in-editor chat panel.',
      schema: {
        text: z.string().describe('Message text to send'),
      },
      handler: (ctx, params) =>
        chatSendMessage(ctx.bridge, params as { text: string }),
    },
  ];
}
