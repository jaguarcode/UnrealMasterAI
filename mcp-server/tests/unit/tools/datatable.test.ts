import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { datatableCreate } from '../../../src/tools/datatable/create.js';
import { datatableAddRow } from '../../../src/tools/datatable/add-row.js';
import { datatableGetRows } from '../../../src/tools/datatable/get-rows.js';
import { datatableRemoveRow } from '../../../src/tools/datatable/remove-row.js';

describe('datatable tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- datatableCreate ---
  describe('datatableCreate', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { tableName: 'MyTable', objectPath: '/Game/Data/MyTable.MyTable' },
        duration_ms: 10,
      });
      const result = await datatableCreate(mockBridge, {
        tableName: 'MyTable',
        tablePath: '/Game/Data',
        rowStructPath: '/Game/Structs/MyStruct.MyStruct',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('tableName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Failed to create DataTable' },
        duration_ms: 5,
      });
      const result = await datatableCreate(mockBridge, {
        tableName: 'Bad',
        tablePath: '/Game/Data',
        rowStructPath: '/Game/Structs/Missing.Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await datatableCreate(mockBridge, {
        tableName: 'MyTable',
        tablePath: '/Game/Data',
        rowStructPath: '/Game/Structs/MyStruct.MyStruct',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- datatableAddRow ---
  describe('datatableAddRow', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { tablePath: '/Game/Data/MyTable', rowName: 'Row1', added: true },
        duration_ms: 10,
      });
      const result = await datatableAddRow(mockBridge, {
        tablePath: '/Game/Data/MyTable',
        rowName: 'Row1',
        rowData: { Health: 100 },
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('added');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Table not found' },
        duration_ms: 5,
      });
      const result = await datatableAddRow(mockBridge, {
        tablePath: '/Game/Data/Missing',
        rowName: 'Row1',
        rowData: {},
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- datatableGetRows ---
  describe('datatableGetRows', () => {
    it('returns success with rows', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { tablePath: '/Game/Data/MyTable', rowCount: 2, rows: ['Row1', 'Row2'] },
        duration_ms: 10,
      });
      const result = await datatableGetRows(mockBridge, {
        tablePath: '/Game/Data/MyTable',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('rows');
      expect(parsed.result.rowCount).toBe(2);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Table not found' },
        duration_ms: 5,
      });
      const result = await datatableGetRows(mockBridge, {
        tablePath: '/Game/Data/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- datatableRemoveRow ---
  describe('datatableRemoveRow', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { tablePath: '/Game/Data/MyTable', rowName: 'Row1', removed: true },
        duration_ms: 10,
      });
      const result = await datatableRemoveRow(mockBridge, {
        tablePath: '/Game/Data/MyTable',
        rowName: 'Row1',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('removed');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Table not found' },
        duration_ms: 5,
      });
      const result = await datatableRemoveRow(mockBridge, {
        tablePath: '/Game/Data/Missing',
        rowName: 'Row1',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
