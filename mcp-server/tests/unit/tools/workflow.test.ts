import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { workflowCreateCharacter } from '../../../src/tools/workflow/create-character.js';
import { workflowCreateUIScreen } from '../../../src/tools/workflow/create-ui-screen.js';
import { workflowSetupLevel } from '../../../src/tools/workflow/setup-level.js';
import { workflowCreateInteractable } from '../../../src/tools/workflow/create-interactable.js';
import { workflowCreateProjectile } from '../../../src/tools/workflow/create-projectile.js';
import { workflowSetupMultiplayer } from '../../../src/tools/workflow/setup-multiplayer.js';
import { workflowCreateInventorySystem } from '../../../src/tools/workflow/create-inventory-system.js';
import { workflowCreateDialogueSystem } from '../../../src/tools/workflow/create-dialogue-system.js';

describe('workflow tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // workflowCreateCharacter
  describe('workflowCreateCharacter', () => {
    it('returns success result when bridge resolves', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ result: { created: ['BP_Hero'] } });
      const result = await workflowCreateCharacter(mockBridge, { characterName: 'Hero', basePath: '/Game/Characters' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('returns error result when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ error: 'Blueprint creation failed' });
      const result = await workflowCreateCharacter(mockBridge, { characterName: 'Hero', basePath: '/Game/Characters' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('Blueprint creation failed');
    });
  });

  // workflowCreateUIScreen
  describe('workflowCreateUIScreen', () => {
    it('returns success result when bridge resolves', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ result: { created: ['WBP_MainMenu'] } });
      const result = await workflowCreateUIScreen(mockBridge, { screenName: 'MainMenu', screenPath: '/Game/UI', screenType: 'menu' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('returns error result when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('WebSocket disconnected'));
      const result = await workflowCreateUIScreen(mockBridge, { screenName: 'MainMenu', screenPath: '/Game/UI' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('WebSocket disconnected');
    });
  });

  // workflowSetupLevel
  describe('workflowSetupLevel', () => {
    it('returns success result when bridge resolves', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ result: { levelPath: '/Game/Maps/TestLevel' } });
      const result = await workflowSetupLevel(mockBridge, { levelName: 'TestLevel', levelPath: '/Game/Maps' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('returns error result when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ error: 'Level already exists' });
      const result = await workflowSetupLevel(mockBridge, { levelName: 'TestLevel', levelPath: '/Game/Maps' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('Level already exists');
    });
  });

  // workflowCreateInteractable
  describe('workflowCreateInteractable', () => {
    it('returns success result when bridge resolves', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ result: { created: ['BP_Door'] } });
      const result = await workflowCreateInteractable(mockBridge, { interactableName: 'Door', basePath: '/Game/Interactables' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('returns error result when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ error: 'Asset creation failed' });
      const result = await workflowCreateInteractable(mockBridge, { interactableName: 'Door', basePath: '/Game/Interactables', interactionType: 'door' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('Asset creation failed');
    });
  });

  // workflowCreateProjectile
  describe('workflowCreateProjectile', () => {
    it('returns success result when bridge resolves', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ result: { created: ['BP_Bullet'] } });
      const result = await workflowCreateProjectile(mockBridge, { projectileName: 'Bullet', basePath: '/Game/Weapons', speed: 5000, damage: 25 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('returns error result when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('Timeout'));
      const result = await workflowCreateProjectile(mockBridge, { projectileName: 'Bullet', basePath: '/Game/Weapons' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('Timeout');
    });
  });

  // workflowSetupMultiplayer
  describe('workflowSetupMultiplayer', () => {
    it('returns success result when bridge resolves', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ result: { created: ['GM_MyGame', 'PS_MyGame', 'GS_MyGame'] } });
      const result = await workflowSetupMultiplayer(mockBridge, { gameName: 'MyGame', basePath: '/Game/Multiplayer', maxPlayers: 8 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('returns error result when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ error: 'GameMode creation failed' });
      const result = await workflowSetupMultiplayer(mockBridge, { gameName: 'MyGame', basePath: '/Game/Multiplayer' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('GameMode creation failed');
    });
  });

  // workflowCreateInventorySystem
  describe('workflowCreateInventorySystem', () => {
    it('returns success result when bridge resolves', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ result: { created: ['DT_PlayerInventoryItems', 'BC_PlayerInventoryInventory'] } });
      const result = await workflowCreateInventorySystem(mockBridge, { systemName: 'PlayerInventory', basePath: '/Game/Inventory', maxSlots: 30 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('returns error result when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('DataTable creation failed'));
      const result = await workflowCreateInventorySystem(mockBridge, { systemName: 'PlayerInventory', basePath: '/Game/Inventory' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('DataTable creation failed');
    });
  });

  // workflowCreateDialogueSystem
  describe('workflowCreateDialogueSystem', () => {
    it('returns success result when bridge resolves', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ result: { created: ['DT_NPCDialogue', 'WBP_NPCDialogue', 'BP_NPCDialogueManager'] } });
      const result = await workflowCreateDialogueSystem(mockBridge, { systemName: 'NPC', basePath: '/Game/Dialogue' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('returns error result when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({ error: 'Widget Blueprint creation failed' });
      const result = await workflowCreateDialogueSystem(mockBridge, { systemName: 'NPC', basePath: '/Game/Dialogue' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('Widget Blueprint creation failed');
    });
  });
});
