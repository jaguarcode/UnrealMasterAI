import { describe, it, expect } from 'vitest';
import { getAllBuiltinTools } from '../../../src/tools/auto-register.js';

describe('auto-register', () => {
  describe('getAllBuiltinTools', () => {
    it('returns all 185 built-in tools', () => {
      const tools = getAllBuiltinTools();
      expect(tools.length).toBe(187);
    });

    it('has no duplicate tool names', () => {
      const tools = getAllBuiltinTools();
      const names = tools.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('every tool has required fields', () => {
      const tools = getAllBuiltinTools();
      for (const tool of tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(typeof tool.schema).toBe('object');
        expect(typeof tool.handler).toBe('function');
      }
    });

    it('tool names match expected format (domain-action)', () => {
      const tools = getAllBuiltinTools();
      for (const tool of tools) {
        expect(tool.name).toMatch(/^[a-z]+-[a-zA-Z]+$/);
      }
    });

    it('includes tools from all 37 domains', () => {
      const tools = getAllBuiltinTools();
      const domains = new Set(tools.map(t => t.name.split('-')[0]));
      expect(domains.size).toBe(37);
    });
  });
});
