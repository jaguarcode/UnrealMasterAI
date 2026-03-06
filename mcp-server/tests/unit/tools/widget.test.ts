import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { widgetCreate } from '../../../src/tools/widget/create.js';
import { widgetGetInfo } from '../../../src/tools/widget/get-info.js';
import { widgetAddElement } from '../../../src/tools/widget/add-element.js';
import { widgetSetProperty } from '../../../src/tools/widget/set-property.js';
import { widgetGetBindings } from '../../../src/tools/widget/get-bindings.js';
import { widgetListWidgets } from '../../../src/tools/widget/list-widgets.js';

describe('widget tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- widgetCreate ---
  describe('widgetCreate', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { widgetName: 'HUD', objectPath: '/Game/UI/HUD.HUD' },
        duration_ms: 10,
      });
      const result = await widgetCreate(mockBridge, {
        widgetName: 'HUD',
        widgetPath: '/Game/UI',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('widgetName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7700, message: 'Failed to create Widget Blueprint' },
        duration_ms: 5,
      });
      const result = await widgetCreate(mockBridge, {
        widgetName: 'HUD',
        widgetPath: '/Game/UI',
        parentClass: 'UserWidget',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await widgetCreate(mockBridge, {
        widgetName: 'HUD',
        widgetPath: '/Game/UI',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- widgetGetInfo ---
  describe('widgetGetInfo', () => {
    it('returns success with widget tree info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          widgetPath: '/Game/UI/HUD',
          rootWidgetType: 'CanvasPanel',
          widgetTree: [{ name: 'CanvasPanel_0', type: 'CanvasPanel' }],
          widgetCount: 1,
          bindingsCount: 0,
        },
        duration_ms: 10,
      });
      const result = await widgetGetInfo(mockBridge, { widgetPath: '/Game/UI/HUD' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('rootWidgetType');
      expect(parsed.result).toHaveProperty('widgetTree');
    });

    it('returns error when widget not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7701, message: "Widget Blueprint not found: '/Game/UI/Missing'" },
        duration_ms: 5,
      });
      const result = await widgetGetInfo(mockBridge, { widgetPath: '/Game/UI/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- widgetAddElement ---
  describe('widgetAddElement', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { widgetPath: '/Game/UI/HUD', elementName: 'MyText', elementType: 'TextBlock' },
        duration_ms: 10,
      });
      const result = await widgetAddElement(mockBridge, {
        widgetPath: '/Game/UI/HUD',
        elementType: 'TextBlock',
        elementName: 'MyText',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('elementName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7702, message: "Unknown element type: 'FakeWidget'" },
        duration_ms: 5,
      });
      const result = await widgetAddElement(mockBridge, {
        widgetPath: '/Game/UI/HUD',
        elementType: 'FakeWidget',
        elementName: 'Bad',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await widgetAddElement(mockBridge, {
        widgetPath: '/Game/UI/HUD',
        elementType: 'Button',
        elementName: 'MyBtn',
        parentName: 'CanvasPanel_0',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });

  // --- widgetSetProperty ---
  describe('widgetSetProperty', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { widgetPath: '/Game/UI/HUD', elementName: 'MyText', propertyName: 'text', propertyValue: 'Hello' },
        duration_ms: 10,
      });
      const result = await widgetSetProperty(mockBridge, {
        widgetPath: '/Game/UI/HUD',
        elementName: 'MyText',
        propertyName: 'text',
        propertyValue: 'Hello',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('propertyName');
    });

    it('returns error when element not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7706, message: "Element 'Ghost' not found in widget tree" },
        duration_ms: 5,
      });
      const result = await widgetSetProperty(mockBridge, {
        widgetPath: '/Game/UI/HUD',
        elementName: 'Ghost',
        propertyName: 'text',
        propertyValue: 'Hi',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- widgetGetBindings ---
  describe('widgetGetBindings', () => {
    it('returns success with bindings info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          widgetPath: '/Game/UI/HUD',
          bindings: [{ objectName: 'MyText', propertyPath: 'Text' }],
          bindingsCount: 1,
          eventDispatchers: [],
          eventDispatchersCount: 0,
        },
        duration_ms: 10,
      });
      const result = await widgetGetBindings(mockBridge, { widgetPath: '/Game/UI/HUD' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('bindings');
      expect(parsed.result).toHaveProperty('eventDispatchers');
    });

    it('returns error when widget not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7701, message: "Widget Blueprint not found: '/Game/UI/Missing'" },
        duration_ms: 5,
      });
      const result = await widgetGetBindings(mockBridge, { widgetPath: '/Game/UI/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- widgetListWidgets ---
  describe('widgetListWidgets', () => {
    it('returns success with widget list', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { widgets: ['/Game/UI/HUD', '/Game/UI/MainMenu'], count: 2, path: '/Game/UI' },
        duration_ms: 10,
      });
      const result = await widgetListWidgets(mockBridge, { path: '/Game/UI', recursive: true });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('widgets');
      expect(parsed.result.count).toBe(2);
    });

    it('returns success with empty list', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { widgets: [], count: 0, path: '/Game/Empty' },
        duration_ms: 10,
      });
      const result = await widgetListWidgets(mockBridge, { path: '/Game/Empty' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.count).toBe(0);
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('bridge error'));
      const result = await widgetListWidgets(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('bridge error');
    });
  });
});
