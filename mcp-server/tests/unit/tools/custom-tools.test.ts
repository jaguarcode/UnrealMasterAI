import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadCustomTools } from '../../../src/tools/auto-register.js';
import fs from 'node:fs';
import path from 'node:path';

describe('loadCustomTools', () => {
  it('returns empty array when directory does not exist', async () => {
    const tools = await loadCustomTools('/nonexistent/path/custom-tools');
    expect(tools).toEqual([]);
  });

  it('returns empty array for directory with no tool files', async () => {
    const tmpDir = path.resolve(process.cwd(), '.tmp-custom-test');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Not a tool');
    try {
      const tools = await loadCustomTools(tmpDir);
      expect(tools).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('skips files starting with underscore', async () => {
    const tmpDir = path.resolve(process.cwd(), '.tmp-custom-test-2');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '_helper.js'), 'export default {}');
    try {
      const tools = await loadCustomTools(tmpDir);
      expect(tools).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('skips .d.ts files', async () => {
    const tmpDir = path.resolve(process.cwd(), '.tmp-custom-test-3');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'types.d.ts'), 'export type Foo = string;');
    try {
      const tools = await loadCustomTools(tmpDir);
      expect(tools).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('gracefully handles files that fail to import', async () => {
    const tmpDir = path.resolve(process.cwd(), '.tmp-custom-test-4');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'broken.js'), 'throw new Error("broken");');
    try {
      const tools = await loadCustomTools(tmpDir);
      expect(tools).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
