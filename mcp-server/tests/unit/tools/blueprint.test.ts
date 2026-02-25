import { describe, it, expect } from 'vitest';
import {
  BlueprintASTSchema,
  BlueprintNodeSchema,
  BlueprintGraphSchema,
  BlueprintPinSchema,
  BlueprintPinLinkSchema,
  GraphTypeSchema,
} from '../../../src/types/blueprint-schema.js';
import sampleBlueprint from '../../fixtures/sample-blueprint.json';

describe('Blueprint AST Schema', () => {
  // -------------------------------------------------------------------------
  // Fixture validation
  // -------------------------------------------------------------------------

  it('sample-blueprint.json validates against BlueprintASTSchema', () => {
    const result = BlueprintASTSchema.safeParse(sampleBlueprint);
    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Top-level required fields
  // -------------------------------------------------------------------------

  it('schema requires blueprintPath (string)', () => {
    const { blueprintPath: _, ...rest } = sampleBlueprint;
    const result = BlueprintASTSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('schema requires blueprintClass (string)', () => {
    const { blueprintClass: _, ...rest } = sampleBlueprint;
    const result = BlueprintASTSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('schema requires parentClass (string)', () => {
    const { parentClass: _, ...rest } = sampleBlueprint;
    const result = BlueprintASTSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('schema requires graphs array with at least 1 entry', () => {
    const empty = { ...sampleBlueprint, graphs: [] };
    const result = BlueprintASTSchema.safeParse(empty);
    expect(result.success).toBe(false);
  });

  it('rejects JSON missing required fields (blueprintPath)', () => {
    const result = BlueprintASTSchema.safeParse({
      blueprintClass: 'Blueprint',
      parentClass: 'Actor',
      graphs: [{ graphName: 'G', graphType: 'EventGraph', nodes: [] }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('blueprintPath');
    }
  });

  // -------------------------------------------------------------------------
  // Graph-level validation
  // -------------------------------------------------------------------------

  it('each graph has graphName, graphType, nodes array', () => {
    const graph = sampleBlueprint.graphs[0];
    const result = BlueprintGraphSchema.safeParse(graph);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveProperty('graphName');
      expect(result.data).toHaveProperty('graphType');
      expect(result.data).toHaveProperty('nodes');
      expect(Array.isArray(result.data.nodes)).toBe(true);
    }
  });

  it('graphType must be one of: EventGraph, FunctionGraph, MacroGraph, AnimGraph', () => {
    const validTypes = ['EventGraph', 'FunctionGraph', 'MacroGraph', 'AnimGraph'];
    for (const t of validTypes) {
      expect(GraphTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it('rejects invalid graphType enum value', () => {
    const result = GraphTypeSchema.safeParse('ConstructionScript');
    expect(result.success).toBe(false);

    // Also test within a full graph object
    const graph = {
      graphName: 'Bad',
      graphType: 'InvalidType',
      nodes: [],
    };
    expect(BlueprintGraphSchema.safeParse(graph).success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Node-level validation
  // -------------------------------------------------------------------------

  it('each node has nodeId (UUID), nodeClass, nodeTitle, posX, posY, pins', () => {
    const node = sampleBlueprint.graphs[0].nodes[0];
    const result = BlueprintNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nodeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(typeof result.data.nodeClass).toBe('string');
      expect(typeof result.data.nodeTitle).toBe('string');
      expect(typeof result.data.posX).toBe('number');
      expect(typeof result.data.posY).toBe('number');
      expect(Array.isArray(result.data.pins)).toBe(true);
    }
  });

  it('rejects node with non-UUID nodeId', () => {
    const node = {
      nodeId: 'not-a-uuid',
      nodeClass: 'K2Node_Event',
      nodeTitle: 'Test',
      posX: 0,
      posY: 0,
      pins: [],
    };
    const result = BlueprintNodeSchema.safeParse(node);
    expect(result.success).toBe(false);
  });

  it('rejects node with non-integer posX', () => {
    const node = {
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      nodeClass: 'K2Node_Event',
      nodeTitle: 'Test',
      posX: 1.5,
      posY: 0,
      pins: [],
    };
    const result = BlueprintNodeSchema.safeParse(node);
    expect(result.success).toBe(false);
  });

  it('node.comment defaults to empty string when omitted', () => {
    const node = {
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      nodeClass: 'K2Node_Event',
      nodeTitle: 'Test',
      posX: 0,
      posY: 0,
      pins: [],
    };
    const result = BlueprintNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.comment).toBe('');
    }
  });

  // -------------------------------------------------------------------------
  // Pin-level validation
  // -------------------------------------------------------------------------

  it('each pin has pinId, pinName, direction (Input|Output), category', () => {
    const pin = sampleBlueprint.graphs[0].nodes[0].pins[0];
    const result = BlueprintPinSchema.safeParse(pin);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pinId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(typeof result.data.pinName).toBe('string');
      expect(['Input', 'Output']).toContain(result.data.direction);
      expect(typeof result.data.category).toBe('string');
    }
  });

  it('rejects invalid pin direction enum value', () => {
    const pin = {
      pinId: '550e8400-e29b-41d4-a716-446655440010',
      pinName: 'test',
      direction: 'Bidirectional',
      category: 'exec',
      isExec: true,
      linkedTo: [],
    };
    const result = BlueprintPinSchema.safeParse(pin);
    expect(result.success).toBe(false);
  });

  it('pin.defaultValue defaults to empty string when omitted', () => {
    const pin = {
      pinId: '550e8400-e29b-41d4-a716-446655440010',
      pinName: 'test',
      direction: 'Output',
      category: 'exec',
      isExec: true,
      linkedTo: [],
    };
    const result = BlueprintPinSchema.safeParse(pin);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultValue).toBe('');
    }
  });

  it('pin.subCategory defaults to empty string when omitted', () => {
    const pin = {
      pinId: '550e8400-e29b-41d4-a716-446655440010',
      pinName: 'test',
      direction: 'Input',
      category: 'bool',
      isExec: false,
      linkedTo: [],
    };
    const result = BlueprintPinSchema.safeParse(pin);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subCategory).toBe('');
    }
  });

  // -------------------------------------------------------------------------
  // Pin links
  // -------------------------------------------------------------------------

  it('pin.linkedTo is array of {nodeId, pinId} pairs', () => {
    const pin = sampleBlueprint.graphs[0].nodes[0].pins[0];
    const result = BlueprintPinSchema.safeParse(pin);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data.linkedTo)).toBe(true);
      for (const link of result.data.linkedTo) {
        expect(link).toHaveProperty('nodeId');
        expect(link).toHaveProperty('pinId');
      }
    }
  });

  it('rejects pin link with non-UUID nodeId', () => {
    const link = { nodeId: 'bad', pinId: '550e8400-e29b-41d4-a716-446655440010' };
    const result = BlueprintPinLinkSchema.safeParse(link);
    expect(result.success).toBe(false);
  });

  it('rejects pin link with non-UUID pinId', () => {
    const link = { nodeId: '550e8400-e29b-41d4-a716-446655440010', pinId: 'bad' };
    const result = BlueprintPinLinkSchema.safeParse(link);
    expect(result.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Partial serialization
  // -------------------------------------------------------------------------

  it('partial serialization: single node validates independently', () => {
    const node = sampleBlueprint.graphs[0].nodes[1]; // PrintString node
    const result = BlueprintNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nodeTitle).toBe('Print String');
      expect(result.data.pins.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('partial serialization: single graph validates independently', () => {
    const graph = sampleBlueprint.graphs[0];
    const result = BlueprintGraphSchema.safeParse(graph);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nodes.length).toBeGreaterThanOrEqual(5);
    }
  });

  // -------------------------------------------------------------------------
  // Fixture integrity: reciprocal links
  // -------------------------------------------------------------------------

  it('fixture has reciprocal pin linkages', () => {
    const nodes = sampleBlueprint.graphs[0].nodes;
    const pinMap = new Map<string, { nodeId: string; linkedTo: Array<{ nodeId: string; pinId: string }> }>();

    // Build map of pinId -> { nodeId, linkedTo }
    for (const node of nodes) {
      for (const pin of node.pins) {
        pinMap.set(pin.pinId, { nodeId: node.nodeId, linkedTo: pin.linkedTo });
      }
    }

    // For every link A->B, check that B links back to A
    for (const [pinId, info] of pinMap) {
      for (const link of info.linkedTo) {
        const target = pinMap.get(link.pinId);
        expect(target).toBeDefined();
        if (target) {
          const backLink = target.linkedTo.find(
            (l) => l.nodeId === info.nodeId && l.pinId === pinId,
          );
          expect(backLink).toBeDefined();
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // Fixture has 5+ nodes
  // -------------------------------------------------------------------------

  it('fixture contains at least 5 nodes', () => {
    const nodeCount = sampleBlueprint.graphs[0].nodes.length;
    expect(nodeCount).toBeGreaterThanOrEqual(5);
  });
});
