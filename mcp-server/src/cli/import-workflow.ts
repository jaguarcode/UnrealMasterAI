/**
 * CLI command: import-workflow
 * Imports a workflow JSON file from a local path, HTTPS URL, or community
 * workflow ID into the persistent learned-workflows store.
 *
 * Usage:
 *   unreal-master-mcp-server import-workflow <path-or-url-or-id>
 */
import { readFileSync, existsSync } from 'fs';
import { validateWorkflow } from '../tools/context/workflow-schema.js';
import { appendLearnedWorkflow } from '../tools/context/workflow-store.js';
import type { Workflow } from '../tools/context/workflow-knowledge.js';

const COMMUNITY_API = 'https://unrealworkflow-production.up.railway.app/api/v1';

function resolveSource(source: string): string {
  if (source.startsWith('https://') || source.startsWith('http://')) {
    return source;
  }
  if (existsSync(source)) {
    return source;
  }
  // Treat as community workflow ID — resolve to download URL
  return `${COMMUNITY_API}/workflows/${source}/download`;
}

export async function runImportWorkflow(source: string): Promise<void> {
  const resolved = resolveSource(source);
  let raw: string;

  try {
    if (resolved.startsWith('https://') || resolved.startsWith('http://')) {
      console.error(`Fetching workflow from ${resolved.includes(COMMUNITY_API) ? 'Workflow Community' : resolved}...`);
      const response = await fetch(resolved);
      if (!response.ok) {
        console.error(`Error: HTTP ${response.status} ${response.statusText} — ${resolved}`);
        process.exit(1);
      }
      raw = await response.text();
    } else {
      raw = readFileSync(resolved, 'utf-8');
    }
  } catch (err) {
    console.error(`Error reading source: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`Error parsing JSON: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const result = validateWorkflow(json);

  if (!result.valid) {
    console.error('Workflow validation failed:');
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  // The share format wraps the workflow in an envelope: { version, workflow, author, ... }
  const workflow = result.workflow.workflow;

  try {
    appendLearnedWorkflow(workflow as Workflow);
  } catch (err) {
    console.error(`Error saving workflow: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  console.error(`Imported workflow: "${workflow.name}" (${workflow.id}) [${workflow.domain}]`);
}
