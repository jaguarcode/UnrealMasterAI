/**
 * context.learnWorkflow, context.matchIntent, context.recordOutcome, and context.learnFromDocs tool handlers.
 * Enables the system to learn new UE developer workflows, match intent, track outcomes,
 * and auto-learn from Epic's official documentation.
 */
import type { McpToolResult } from '../editor/ping.js';
import {
  addLearnedWorkflow,
  getAllWorkflows,
  getLearnedWorkflows,
  getWorkflowById,
  type Workflow,
} from './workflow-knowledge.js';
import { matchIntent } from './intent-matcher.js';
import {
  recordOutcome,
  getOutcomeStats,
  getAllOutcomeStats,
  type WorkflowOutcome,
} from './workflow-store.js';

export interface LearnWorkflowParams {
  id: string;
  name: string;
  description: string;
  domain: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  intentPatterns: string[];
  prerequisites?: string[];
  steps: Array<{ tool: string; purpose: string; optional?: boolean; repeat?: boolean }>;
  expectedOutcome: string;
  source?: string;
  tags?: string[];
}

export interface MatchIntentParams {
  query: string;
  maxResults?: number;
}

export interface RecordOutcomeParams {
  workflowId: string;
  success: boolean;
  toolsUsed?: string[];
  durationMs?: number;
  notes?: string;
}

export interface LearnFromDocsParams {
  domain: string;
  docContent: string;
  docSource?: string;
}

/**
 * Learn a new workflow and add it to the persistent knowledge base.
 */
export async function contextLearnWorkflow(
  params: LearnWorkflowParams,
): Promise<McpToolResult> {
  try {
    const workflow: Workflow = {
      id: params.id,
      name: params.name,
      description: params.description,
      domain: params.domain,
      difficulty: params.difficulty ?? 'intermediate',
      intentPatterns: params.intentPatterns,
      prerequisites: params.prerequisites ?? [],
      steps: params.steps,
      expectedOutcome: params.expectedOutcome,
      source: (params.source as Workflow['source']) ?? 'user-defined',
      tags: params.tags ?? [params.domain],
    };

    addLearnedWorkflow(workflow);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            message: `Workflow "${workflow.name}" learned and persisted to disk`,
            id: workflow.id,
            totalWorkflows: getAllWorkflows().length,
            learnedWorkflows: getLearnedWorkflows().length,
            persistent: true,
          }),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}

/**
 * Match a natural language intent to known workflows and return recommendations
 * with confidence scores boosted by outcome history.
 */
export async function contextMatchIntent(
  params: MatchIntentParams,
): Promise<McpToolResult> {
  try {
    const result = matchIntent(params.query, params.maxResults ?? 5);

    const output = {
      status: 'success',
      query: result.query,
      matchCount: result.matches.length,
      confidence: result.confidence,
      topRecommendation: result.topRecommendation
        ? {
            id: result.topRecommendation.id,
            name: result.topRecommendation.name,
            description: result.topRecommendation.description,
            difficulty: result.topRecommendation.difficulty,
            steps: result.topRecommendation.steps,
            expectedOutcome: result.topRecommendation.expectedOutcome,
          }
        : null,
      suggestedToolSequence: result.suggestedToolSequence,
      allMatches: result.matches.map((m) => ({
        id: m.workflow.id,
        name: m.workflow.name,
        score: Math.round(m.score * 100) / 100,
        confidence: Math.round(m.confidence * 100) / 100,
        matchedPatterns: m.matchedPatterns,
        domain: m.workflow.domain,
        difficulty: m.workflow.difficulty,
        stepCount: m.workflow.steps.length,
        outcomeInfo: m.outcomeInfo ?? null,
      })),
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}

/**
 * Record the outcome of a workflow execution for future confidence weighting.
 */
export async function contextRecordOutcome(
  params: RecordOutcomeParams,
): Promise<McpToolResult> {
  try {
    // Validate the workflow exists
    const workflow = getWorkflowById(params.workflowId);
    if (!workflow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            error: `Workflow "${params.workflowId}" not found. Use context-learnWorkflow to register it first.`,
          }),
        }],
      };
    }

    const outcome: WorkflowOutcome = {
      workflowId: params.workflowId,
      timestamp: Date.now(),
      success: params.success,
      toolsUsed: params.toolsUsed ?? [],
      durationMs: params.durationMs,
      notes: params.notes,
    };

    recordOutcome(outcome);

    const stats = getOutcomeStats(params.workflowId);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'success',
          message: `Outcome recorded for "${workflow.name}"`,
          outcome: {
            workflowId: params.workflowId,
            success: params.success,
          },
          cumulativeStats: stats,
        }),
      }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}

/**
 * Parse documentation content and extract workflow definitions.
 * Expects structured doc content describing a UE workflow with steps.
 */
export async function contextLearnFromDocs(
  params: LearnFromDocsParams,
): Promise<McpToolResult> {
  try {
    const { domain, docContent, docSource } = params;

    // Extract workflow structure from documentation content
    const workflows = parseDocToWorkflows(domain, docContent, docSource ?? 'epic-docs');

    if (workflows.length === 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            message: 'No structured workflows could be extracted from the documentation. Use context-learnWorkflow to manually define workflows from this content.',
            hint: 'Provide documentation that describes step-by-step processes with clear tool/action references.',
          }),
        }],
      };
    }

    for (const wf of workflows) {
      addLearnedWorkflow(wf);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'success',
          message: `Extracted and learned ${workflows.length} workflow(s) from documentation`,
          workflows: workflows.map((w) => ({
            id: w.id,
            name: w.name,
            domain: w.domain,
            stepCount: w.steps.length,
          })),
          totalWorkflows: getAllWorkflows().length,
        }),
      }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}

/**
 * Get outcome statistics for all tracked workflows.
 */
export async function contextGetOutcomeStats(): Promise<McpToolResult> {
  try {
    const stats = getAllOutcomeStats();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'success',
          trackedWorkflows: stats.length,
          stats,
        }),
      }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}

// ── Doc Parsing Helpers ──

const TOOL_MAPPING: Record<string, string> = {
  // Map common UE doc action phrases to MCP tool names
  'create blueprint': 'asset-create',
  'create material': 'material-create',
  'create widget': 'widget-create',
  'create level': 'level-create',
  'create sequence': 'sequencer-create',
  'create niagara': 'niagara-createSystem',
  'create landscape': 'landscape-create',
  'create animation': 'anim-createMontage',
  'create behavior tree': 'ai-createBehaviorTree',
  'create blackboard': 'ai-createBlackboard',
  'add component': 'actor-addComponent',
  'add node': 'blueprint-createNode',
  'connect pins': 'blueprint-connectPins',
  'connect nodes': 'blueprint-connectPins',
  'set property': 'actor-setProperty',
  'set parameter': 'material-setParameter',
  'set texture': 'material-setTexture',
  'import mesh': 'asset-import',
  'import texture': 'texture-import',
  'import audio': 'audio-import',
  'import fbx': 'asset-import',
  'spawn actor': 'actor-spawn',
  'place actor': 'actor-spawn',
  'add input': 'gameplay-addInputAction',
  'set game mode': 'gameplay-setGameMode',
  'add emitter': 'niagara-addEmitter',
  'add track': 'sequencer-addTrack',
  'set keyframe': 'sequencer-setKeyframe',
  'paint layer': 'landscape-setMaterial',
  'build lighting': 'build-lightmaps',
  'save level': 'level-save',
  'open level': 'level-open',
  'compile': 'compilation-trigger',
};

function parseDocToWorkflows(domain: string, content: string, source: string): Workflow[] {
  const workflows: Workflow[] = [];
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);

  // Look for numbered steps or bullet points that describe a process
  const steps: Array<{ tool: string; purpose: string }> = [];
  let title = '';
  let description = '';

  for (const line of lines) {
    // Extract title from first heading-like line
    if (!title && (line.startsWith('#') || line.startsWith('How to') || line.startsWith('Setting up'))) {
      title = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    // Extract description from first paragraph-like line after title
    if (title && !description && !line.match(/^\d+[\.\)]/)) {
      description = line;
      continue;
    }

    // Parse numbered/bulleted steps
    const stepMatch = line.match(/^\d+[\.\)]\s*(.+)/);
    if (stepMatch) {
      const stepText = stepMatch[1].toLowerCase();
      // Try to map to a tool
      let matched = false;
      for (const [phrase, tool] of Object.entries(TOOL_MAPPING)) {
        if (stepText.includes(phrase)) {
          steps.push({ tool, purpose: stepMatch[1] });
          matched = true;
          break;
        }
      }
      if (!matched) {
        // Use generic python-execute for unmapped steps
        steps.push({ tool: 'python-execute', purpose: stepMatch[1] });
      }
    }
  }

  if (title && steps.length >= 2) {
    const id = `doc-${domain}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;

    // Generate intent patterns from the title
    const intentPatterns = [
      title.toLowerCase(),
      `${domain} ${title.toLowerCase().split(' ').slice(0, 3).join(' ')}`,
    ];

    workflows.push({
      id,
      name: title,
      description: description || title,
      domain,
      difficulty: steps.length > 6 ? 'advanced' : steps.length > 3 ? 'intermediate' : 'beginner',
      intentPatterns,
      prerequisites: [],
      steps,
      expectedOutcome: `Completed: ${title}`,
      source: source as Workflow['source'],
      tags: [domain],
    });
  }

  return workflows;
}
