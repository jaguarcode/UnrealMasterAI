/**
 * Integration tests for the WebSocket-based approval flow.
 * Tests that ApprovalGate.requestApproval() sends a WS message and
 * resolves when the UE plugin responds.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketBridge } from '../../src/transport/websocket-bridge.js';
import { ApprovalGate, type SafetyClassification } from '../../src/state/safety.js';
import { MockUEClient } from '../fixtures/mock-ue-client.js';

describe('ApprovalGate WebSocket flow', () => {
  let bridge: WebSocketBridge;
  let mockClient: MockUEClient;
  let gate: ApprovalGate;

  const dangerousClassification: SafetyClassification = {
    level: 'dangerous',
    reason: 'Destructive Blueprint operation',
    requiresApproval: true,
  };

  beforeEach(async () => {
    bridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 5000 });
    await bridge.start();

    mockClient = new MockUEClient();
    await mockClient.connect(`ws://localhost:${bridge.getPort()}`);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Pass bridge so ApprovalGate can send WS messages
    gate = new ApprovalGate(5000, bridge);
  });

  afterEach(async () => {
    await mockClient.disconnect();
    if (bridge.isListening()) await bridge.stop();
  });

  it('sends safety.requestApproval message to UE when approval required', async () => {
    mockClient.setApprovalResponse(true);

    const result = await gate.requestApproval(
      dangerousClassification,
      { toolName: 'blueprint-deleteNode', filePath: '/Game/BP_TestActor' }
    );

    expect(result).toBe(true);
    expect(mockClient.lastReceivedMethod()).toBe('safety.requestApproval');
  });

  it('returns false when UE responds with approved: false', async () => {
    mockClient.setApprovalResponse(false);

    const result = await gate.requestApproval(
      dangerousClassification,
      { toolName: 'blueprint-deleteNode' }
    );

    expect(result).toBe(false);
  });

  it('returns false on WS timeout', async () => {
    // Do not configure mock to respond — let it time out
    const shortTimeoutGate = new ApprovalGate(200, bridge);

    const result = await shortTimeoutGate.requestApproval(
      dangerousClassification,
      { toolName: 'blueprint-deleteNode' }
    );

    expect(result).toBe(false);
  });

  it('auto-approve bypasses WS when autoResponse set (test mode)', async () => {
    gate.setAutoResponse('approve');

    const result = await gate.requestApproval(dangerousClassification, {
      toolName: 'blueprint-deleteNode',
    });

    expect(result).toBe(true);
    // Should NOT have sent any WS message
    expect(mockClient.lastReceivedMethod()).toBeNull();
  });

  it('non-dangerous operations bypass WS entirely', async () => {
    const safeClassification: SafetyClassification = {
      level: 'warn',
      reason: 'Mutation operation',
      requiresApproval: false,
    };

    const result = await gate.requestApproval(safeClassification, {
      toolName: 'blueprint-createNode',
    });

    expect(result).toBe(true);
    expect(mockClient.lastReceivedMethod()).toBeNull();
  });
});
