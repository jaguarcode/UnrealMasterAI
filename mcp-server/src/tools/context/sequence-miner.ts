/**
 * Sequence Miner for Unreal Master Agent.
 * Mines the raw tool-call event journal for frequently repeated, contiguous tool
 * sequences that are NOT yet captured as known workflows. These "workflow
 * candidates" are surfaced to the AI client so it can formalize genuinely new,
 * recurring patterns via the existing `context-learnWorkflow` tool — the
 * self-growth loop of the usage-intelligence layer.
 *
 * This module is a pure function library: it never touches disk. Callers are
 * responsible for supplying the event journal (e.g. from UsageTracker) and
 * persisting anything derived from the results.
 */
import { SESSION_GAP_MS, isMetaTool, type ToolCallEvent } from './usage-types.js';
import { getAllWorkflows } from './workflow-knowledge.js';

export interface WorkflowCandidate {
  /** Ordered tool names making up the candidate sequence */
  sequence: string[];
  /** Number of times this exact contiguous sequence appeared */
  occurrences: number;
  /** Fraction of occurrences where ALL calls in the occurrence succeeded, rounded to 2 decimals */
  successRate: number;
  /** Timestamp of the last event of the most recent occurrence */
  lastSeen: number;
  /** Most common tool-name prefix (text before first '-') across the sequence; ties -> first seen */
  suggestedDomain: string;
  /** `mined-${suggestedDomain}-${hash}`, hash = stable 8-hex-char hash of sequence.join('>') */
  suggestedId: string;
  /** Human-readable label, e.g. "material-create → material-setTexture → material-setParameter" */
  suggestedName: string;
}

export interface MineOptions {
  /** Minimum n-gram length to consider. Default 3. */
  minLength?: number;
  /** Maximum n-gram length to consider. Default 6. */
  maxLength?: number;
  /** Minimum number of occurrences required to keep a candidate. Default 3. */
  minSupport?: number;
  /** Maximum number of candidates to return. Default 10. */
  maxResults?: number;
}

const DEFAULT_MIN_LENGTH = 3;
const DEFAULT_MAX_LENGTH = 6;
const DEFAULT_MIN_SUPPORT = 3;
const DEFAULT_MAX_RESULTS = 10;

/** A single compressed step within a session's tool sequence. */
interface CompressedStep {
  tool: string;
  /** true if at least one call within the compressed run succeeded */
  success: boolean;
  /** timestamp of the last call within the compressed run */
  timestamp: number;
}

/** An observed occurrence of a candidate n-gram. */
interface Occurrence {
  /** true only if every step in this occurrence's window succeeded */
  allSucceeded: boolean;
  /** timestamp of the last step in this occurrence's window */
  timestamp: number;
}

/**
 * Stable djb2 string hash, rendered as an 8-character lowercase hex string.
 */
function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    // hash * 33 + charCode, kept within 32-bit unsigned range
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').slice(-8);
}

/**
 * Splits chronologically-sorted events into sessions wherever the gap between
 * consecutive events is >= SESSION_GAP_MS.
 */
function splitIntoSessions(sortedEvents: ToolCallEvent[]): ToolCallEvent[][] {
  const sessions: ToolCallEvent[][] = [];
  let current: ToolCallEvent[] = [];

  for (const event of sortedEvents) {
    if (current.length === 0) {
      current.push(event);
      continue;
    }
    const prev = current[current.length - 1];
    if (event.timestamp - prev.timestamp >= SESSION_GAP_MS) {
      sessions.push(current);
      current = [event];
    } else {
      current.push(event);
    }
  }

  if (current.length > 0) {
    sessions.push(current);
  }

  return sessions;
}

/**
 * Compresses consecutive duplicate tool calls within a single session's
 * (meta-tool-filtered) event list into single entries.
 */
function compressSession(events: ToolCallEvent[]): CompressedStep[] {
  const filtered = events.filter((e) => !isMetaTool(e.tool));
  const compressed: CompressedStep[] = [];

  for (const event of filtered) {
    const last = compressed[compressed.length - 1];
    if (last && last.tool === event.tool) {
      last.success = last.success || event.success;
      last.timestamp = event.timestamp;
    } else {
      compressed.push({ tool: event.tool, success: event.success, timestamp: event.timestamp });
    }
  }

  return compressed;
}

/**
 * Returns true if `sub` appears as a contiguous subsequence of `full`
 * (including the case where sub equals full).
 */
function isContiguousSubsequence(sub: string[], full: string[]): boolean {
  if (sub.length > full.length) return false;
  for (let start = 0; start + sub.length <= full.length; start++) {
    let matches = true;
    for (let i = 0; i < sub.length; i++) {
      if (full[start + i] !== sub[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

/**
 * Mines the raw tool-call event journal for frequently repeated, contiguous
 * tool sequences that are not already captured by a known workflow.
 */
export function mineWorkflowCandidates(
  events: ToolCallEvent[],
  opts: MineOptions = {},
): WorkflowCandidate[] {
  if (!events || events.length === 0) return [];

  const minLength = opts.minLength ?? DEFAULT_MIN_LENGTH;
  const maxLength = opts.maxLength ?? DEFAULT_MAX_LENGTH;
  const minSupport = opts.minSupport ?? DEFAULT_MIN_SUPPORT;
  const maxResults = opts.maxResults ?? DEFAULT_MAX_RESULTS;

  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const sessions = splitIntoSessions(sortedEvents);
  const compressedSessions = sessions.map(compressSession);

  // Collect occurrences keyed by the joined sequence string.
  const occurrencesByKey = new Map<string, Occurrence[]>();
  const sequenceByKey = new Map<string, string[]>();

  for (const session of compressedSessions) {
    const maxN = Math.min(maxLength, session.length);
    for (let n = minLength; n <= maxN; n++) {
      for (let start = 0; start + n <= session.length; start++) {
        const window = session.slice(start, start + n);
        const sequence = window.map((s) => s.tool);
        const key = sequence.join('>');

        let list = occurrencesByKey.get(key);
        if (!list) {
          list = [];
          occurrencesByKey.set(key, list);
          sequenceByKey.set(key, sequence);
        }

        const allSucceeded = window.every((s) => s.success);
        const timestamp = window[window.length - 1].timestamp;
        list.push({ allSucceeded, timestamp });
      }
    }
  }

  // Build candidates that meet the support threshold.
  interface RawCandidate {
    sequence: string[];
    occurrences: Occurrence[];
  }

  const rawCandidates: RawCandidate[] = [];
  for (const [key, occurrences] of occurrencesByKey.entries()) {
    if (occurrences.length >= minSupport) {
      rawCandidates.push({ sequence: sequenceByKey.get(key)!, occurrences });
    }
  }

  // Closed-pattern filter: drop a candidate if its sequence is a contiguous
  // subsequence of a longer surviving candidate with the SAME occurrence count.
  const closedCandidates = rawCandidates.filter((candidate) => {
    return !rawCandidates.some((other) => {
      if (other === candidate) return false;
      if (other.sequence.length <= candidate.sequence.length) return false;
      if (other.occurrences.length !== candidate.occurrences.length) return false;
      return isContiguousSubsequence(candidate.sequence, other.sequence);
    });
  });

  // Known-workflow filter: drop a candidate if its sequence is a contiguous
  // subsequence of (or equal to) any known workflow's required-step tool list.
  const knownWorkflowStepLists = getAllWorkflows().map((wf) =>
    wf.steps.filter((s) => s.optional !== true).map((s) => s.tool),
  );

  const novelCandidates = closedCandidates.filter((candidate) => {
    return !knownWorkflowStepLists.some((stepList) =>
      isContiguousSubsequence(candidate.sequence, stepList),
    );
  });

  // Build final WorkflowCandidate objects.
  const results: WorkflowCandidate[] = novelCandidates.map(({ sequence, occurrences }) => {
    const successCount = occurrences.filter((o) => o.allSucceeded).length;
    const successRate = Math.round((successCount / occurrences.length) * 100) / 100;
    const lastSeen = occurrences.reduce((max, o) => Math.max(max, o.timestamp), 0);

    const suggestedDomain = computeSuggestedDomain(sequence);
    const hash = djb2Hash(sequence.join('>'));
    const suggestedId = `mined-${suggestedDomain}-${hash}`;
    const suggestedName = sequence.join(' → ');

    return {
      sequence,
      occurrences: occurrences.length,
      successRate,
      lastSeen,
      suggestedDomain,
      suggestedId,
      suggestedName,
    };
  });

  results.sort((a, b) => {
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    return b.lastSeen - a.lastSeen;
  });

  return results.slice(0, maxResults);
}

/**
 * Computes the most common tool-name prefix (text before the first '-')
 * across a sequence. Ties are broken by first-seen order.
 */
function computeSuggestedDomain(sequence: string[]): string {
  const counts = new Map<string, number>();
  const firstSeenOrder: string[] = [];

  for (const tool of sequence) {
    const dashIndex = tool.indexOf('-');
    const prefix = dashIndex === -1 ? tool : tool.slice(0, dashIndex);
    if (!counts.has(prefix)) {
      counts.set(prefix, 0);
      firstSeenOrder.push(prefix);
    }
    counts.set(prefix, counts.get(prefix)! + 1);
  }

  let best = firstSeenOrder[0];
  let bestCount = counts.get(best) ?? 0;
  for (const prefix of firstSeenOrder) {
    const count = counts.get(prefix)!;
    if (count > bestCount) {
      best = prefix;
      bestCount = count;
    }
  }

  return best;
}
