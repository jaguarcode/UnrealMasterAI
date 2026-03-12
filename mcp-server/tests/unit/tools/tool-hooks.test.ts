import { describe, it, expect, vi } from 'vitest';
import { ToolHookManager } from '../../../src/tools/tool-hooks.js';
import type { McpToolResult } from '../../../src/tools/tool-module.js';

describe('ToolHookManager', () => {
  const mockResult: McpToolResult = {
    content: [{ type: 'text', text: '{"status":"success"}' }],
  };

  describe('pre-hooks', () => {
    it('runs pre-hooks in order', async () => {
      const manager = new ToolHookManager();
      const order: number[] = [];

      manager.addPreHook(async () => { order.push(1); });
      manager.addPreHook(async () => { order.push(2); });

      await manager.runPreHooks('test-tool', { a: 1 });
      expect(order).toEqual([1, 2]);
    });

    it('allows pre-hooks to modify params', async () => {
      const manager = new ToolHookManager();
      manager.addPreHook(async ({ params }) => {
        return { ...params, injected: true };
      });

      const result = await manager.runPreHooks('test-tool', { a: 1 });
      expect(result).toEqual({ a: 1, injected: true });
    });

    it('passes modified params to subsequent hooks', async () => {
      const manager = new ToolHookManager();
      manager.addPreHook(async ({ params }) => ({ ...params, step1: true }));
      manager.addPreHook(async ({ params }) => ({ ...params, step2: true }));

      const result = await manager.runPreHooks('test-tool', {});
      expect(result).toEqual({ step1: true, step2: true });
    });

    it('returns original params when hooks return null', async () => {
      const manager = new ToolHookManager();
      manager.addPreHook(async () => null);

      const result = await manager.runPreHooks('test-tool', { original: true });
      expect(result).toEqual({ original: true });
    });

    it('propagates pre-hook errors (rejection)', async () => {
      const manager = new ToolHookManager();
      manager.addPreHook(async () => {
        throw new Error('Rejected by hook');
      });

      await expect(manager.runPreHooks('test-tool', {}))
        .rejects.toThrow('Rejected by hook');
    });

    it('provides tool name to pre-hooks', async () => {
      const manager = new ToolHookManager();
      let receivedName = '';
      manager.addPreHook(async ({ toolName }) => {
        receivedName = toolName;
      });

      await manager.runPreHooks('actor-spawn', {});
      expect(receivedName).toBe('actor-spawn');
    });
  });

  describe('post-hooks', () => {
    it('runs post-hooks in order', async () => {
      const manager = new ToolHookManager();
      const order: number[] = [];

      manager.addPostHook(async () => { order.push(1); });
      manager.addPostHook(async () => { order.push(2); });

      await manager.runPostHooks('test-tool', {}, mockResult, 100);
      expect(order).toEqual([1, 2]);
    });

    it('allows post-hooks to transform result', async () => {
      const manager = new ToolHookManager();
      manager.addPostHook(async () => ({
        content: [{ type: 'text' as const, text: '{"transformed":true}' }],
      }));

      const result = await manager.runPostHooks('test-tool', {}, mockResult, 50);
      expect(result.content[0].text).toBe('{"transformed":true}');
    });

    it('returns original result when hooks return null', async () => {
      const manager = new ToolHookManager();
      manager.addPostHook(async () => null);

      const result = await manager.runPostHooks('test-tool', {}, mockResult, 50);
      expect(result).toBe(mockResult);
    });

    it('provides duration to post-hooks', async () => {
      const manager = new ToolHookManager();
      let receivedDuration = 0;
      manager.addPostHook(async ({ durationMs }) => {
        receivedDuration = durationMs;
      });

      await manager.runPostHooks('test-tool', {}, mockResult, 42);
      expect(receivedDuration).toBe(42);
    });
  });

  describe('getters', () => {
    it('returns registered hooks', () => {
      const manager = new ToolHookManager();
      const preHook = vi.fn();
      const postHook = vi.fn();

      manager.addPreHook(preHook);
      manager.addPostHook(postHook);

      expect(manager.getPreHooks()).toHaveLength(1);
      expect(manager.getPostHooks()).toHaveLength(1);
    });
  });
});
