import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry, type ToolDefinition } from '../../../src/tools/registry.js';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  const pingTool: ToolDefinition = {
    name: 'editor.ping',
    description: 'Ping the UE editor to verify connectivity',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
    handler: async () => ({ content: [{ type: 'text' as const, text: 'pong' }] }),
  };

  const serializeTool: ToolDefinition = {
    name: 'blueprint.serialize',
    description: 'Serialize a Blueprint to JSON AST',
    inputSchema: {
      type: 'object' as const,
      properties: {
        assetPath: { type: 'string', description: 'UE asset path' },
      },
      required: ['assetPath'],
    },
    handler: async () => ({ content: [{ type: 'text' as const, text: '{}' }] }),
  };

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('registerTool() adds tool to registry', () => {
    registry.registerTool(pingTool);
    expect(registry.getTools().length).toBe(1);
  });

  it('registerTool() rejects duplicate tool names', () => {
    registry.registerTool(pingTool);
    expect(() => registry.registerTool(pingTool)).toThrow(/already registered/);
  });

  it('getTools() returns all registered tools', () => {
    registry.registerTool(pingTool);
    registry.registerTool(serializeTool);
    const tools = registry.getTools();
    expect(tools.length).toBe(2);
    expect(tools.map(t => t.name)).toContain('editor.ping');
    expect(tools.map(t => t.name)).toContain('blueprint.serialize');
  });

  it('getTool() returns specific tool by name', () => {
    registry.registerTool(pingTool);
    registry.registerTool(serializeTool);
    const tool = registry.getTool('editor.ping');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('editor.ping');
  });

  it('getTool() returns undefined for unknown tool', () => {
    const tool = registry.getTool('nonexistent.tool');
    expect(tool).toBeUndefined();
  });

  it('hasTool() returns true for registered tools', () => {
    registry.registerTool(pingTool);
    expect(registry.hasTool('editor.ping')).toBe(true);
    expect(registry.hasTool('unknown.tool')).toBe(false);
  });

  it('removeTool() removes an existing tool', () => {
    registry.registerTool(pingTool);
    expect(registry.hasTool('editor.ping')).toBe(true);
    const removed = registry.removeTool('editor.ping');
    expect(removed).toBe(true);
    expect(registry.hasTool('editor.ping')).toBe(false);
    expect(registry.getTools().length).toBe(0);
  });

  it('removeTool() returns false for unknown tool', () => {
    const removed = registry.removeTool('nonexistent.tool');
    expect(removed).toBe(false);
  });

  it('onToolsChanged is called on add (registerTool)', () => {
    let callCount = 0;
    registry.onToolsChanged = () => { callCount++; };
    registry.registerTool(pingTool);
    expect(callCount).toBe(1);
  });

  it('onToolsChanged is called on add (addTool)', () => {
    let callCount = 0;
    registry.onToolsChanged = () => { callCount++; };
    registry.addTool(pingTool.name, {
      description: pingTool.description,
      inputSchema: pingTool.inputSchema,
      handler: pingTool.handler,
    });
    expect(callCount).toBe(1);
  });

  it('onToolsChanged is called on remove', () => {
    registry.registerTool(pingTool);
    let callCount = 0;
    registry.onToolsChanged = () => { callCount++; };
    registry.removeTool('editor.ping');
    expect(callCount).toBe(1);
  });

  it('onToolsChanged is NOT called when removing non-existent tool', () => {
    let callCount = 0;
    registry.onToolsChanged = () => { callCount++; };
    registry.removeTool('nonexistent.tool');
    expect(callCount).toBe(0);
  });

  it('getToolNames() returns all registered tool names', () => {
    registry.registerTool(pingTool);
    registry.registerTool(serializeTool);
    const names = registry.getToolNames();
    expect(names).toHaveLength(2);
    expect(names).toContain('editor.ping');
    expect(names).toContain('blueprint.serialize');
  });

  it('getToolNames() returns empty array when no tools registered', () => {
    expect(registry.getToolNames()).toEqual([]);
  });
});
