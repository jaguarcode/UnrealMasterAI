import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { MockUEClient } from '../../fixtures/mock-ue-client.js';
import { SessionManager } from '../../../src/state/session.js';
import { compilationSelfHeal } from '../../../src/tools/compilation/self-heal.js';

describe('compilationSelfHeal', () => {
  let bridge: WebSocketBridge;
  let client: MockUEClient;
  let session: SessionManager;

  beforeAll(async () => {
    bridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 2000 });
    await bridge.start();
    client = new MockUEClient();
    await client.connect(`ws://localhost:${bridge.getPort()}`);
    // Small delay to ensure connection is established
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterAll(async () => {
    await client.disconnect();
    await bridge.stop();
  });

  beforeEach(() => {
    session = new SessionManager();
  });

  it('returns canRetry=true on first call', async () => {
    const result = await compilationSelfHeal(bridge, session, { filePath: '/MyActor.cpp' });
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.canRetry).toBe(true);
  });

  it('returns errors from bridge', async () => {
    const result = await compilationSelfHeal(bridge, session, { filePath: '/MyActor.cpp' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.errors).toBeDefined();
  });

  it('retryCount starts at 1 on first call', async () => {
    const result = await compilationSelfHeal(bridge, session, { filePath: '/MyActor.cpp' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.retryCount).toBe(1);
  });

  it('incrementing past max retries returns canRetry=false', async () => {
    // exhaust 3 retries
    await compilationSelfHeal(bridge, session, { filePath: '/MyActor.cpp' }); // retry 1
    await compilationSelfHeal(bridge, session, { filePath: '/MyActor.cpp' }); // retry 2
    await compilationSelfHeal(bridge, session, { filePath: '/MyActor.cpp' }); // retry 3
    // 4th call — max exceeded
    const result = await compilationSelfHeal(bridge, session, { filePath: '/MyActor.cpp' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.canRetry).toBe(false);
  });

  it('suggestion includes retry count', async () => {
    const result = await compilationSelfHeal(bridge, session, { filePath: '/MyActor.cpp' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.suggestion).toContain('1');
  });

  it('maxRetries is reported in result', async () => {
    const result = await compilationSelfHeal(bridge, session, { filePath: '/MyActor.cpp' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.maxRetries).toBe(3);
  });

  it('handles bridge not connected', async () => {
    const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 500 });
    await disconnectedBridge.start();
    const result = await compilationSelfHeal(disconnectedBridge, session, { filePath: '/MyActor.cpp' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.canRetry).toBe(false);
    expect(parsed.suggestion).toContain('Check UE plugin connection');
    await disconnectedBridge.stop();
  });

  it('resetRetry allows retrying again after limit', async () => {
    const filePath = '/MyActor.cpp';
    // exhaust retries
    await compilationSelfHeal(bridge, session, { filePath });
    await compilationSelfHeal(bridge, session, { filePath });
    await compilationSelfHeal(bridge, session, { filePath });
    const blocked = await compilationSelfHeal(bridge, session, { filePath });
    expect(JSON.parse(blocked.content[0].text).canRetry).toBe(false);

    // reset and verify it works again
    session.resetRetry(filePath);
    const resumed = await compilationSelfHeal(bridge, session, { filePath });
    expect(JSON.parse(resumed.content[0].text).canRetry).toBe(true);
  });

  it('uses "unknown" as filePath when not provided', async () => {
    const result = await compilationSelfHeal(bridge, session, {});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.canRetry).toBe(true);
    // subsequent calls for no-filePath should share same counter
    await compilationSelfHeal(bridge, session, {});
    await compilationSelfHeal(bridge, session, {});
    const final = await compilationSelfHeal(bridge, session, {});
    expect(JSON.parse(final.content[0].text).canRetry).toBe(false);
  });
});
