#!/usr/bin/env node
/**
 * Interactive Setup Wizard for Unreal Master Agent MCP Server.
 * Invoked via: npx unreal-master-mcp-server init
 *
 * Uses only Node.js built-ins — no external dependencies.
 */
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Helpers ─────────────────────────────────────────────────────────────────

function print(msg: string): void {
  process.stdout.write(msg + '\n');
}

function printDim(msg: string): void {
  process.stdout.write('\x1b[2m' + msg + '\x1b[0m\n');
}

function printGreen(msg: string): void {
  process.stdout.write('\x1b[32m' + msg + '\x1b[0m\n');
}

function printYellow(msg: string): void {
  process.stdout.write('\x1b[33m' + msg + '\x1b[0m\n');
}

function printCyan(msg: string): void {
  process.stdout.write('\x1b[36m' + msg + '\x1b[0m\n');
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

/** Search for .uproject files in common locations, return first found path. */
function detectUEProject(): string | null {
  const searchRoots: string[] = [
    os.homedir(),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Projects'),
    path.join(os.homedir(), 'UnrealProjects'),
    'C:\\Users\\Public\\Documents\\Unreal Projects',
    'C:\\Program Files\\Epic Games',
  ];

  for (const root of searchRoots) {
    try {
      if (!fs.existsSync(root)) continue;
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const subdir = path.join(root, entry.name);
        try {
          const files = fs.readdirSync(subdir);
          const uproject = files.find((f) => f.endsWith('.uproject'));
          if (uproject) return subdir;
        } catch {
          // skip unreadable subdirs
        }
      }
    } catch {
      // skip unreadable roots
    }
  }
  return null;
}

/** Return the platform-specific Claude Desktop config path. */
function claudeConfigPath(): string {
  const platform = process.platform;
  if (platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  }
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  // Linux / other
  return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
}

/** Merge the MCP server entry into an existing or new Claude Desktop config. */
function mergeClaudeConfig(configPath: string): void {
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      // start fresh if unparseable
    }
  }

  const mcpServers =
    (existing['mcpServers'] as Record<string, unknown> | undefined) ?? {};

  mcpServers['unreal-master-agent'] = {
    command: 'npx',
    args: ['-y', 'unreal-master-mcp-server'],
  };

  existing['mcpServers'] = mcpServers;

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
}

// ── Main wizard ──────────────────────────────────────────────────────────────

export async function runInit(): Promise<void> {
  print('');
  print('╔══════════════════════════════════════════════════════════╗');
  print('║       Unreal Master Agent — Setup Wizard                ║');
  print('╚══════════════════════════════════════════════════════════╝');
  print('');

  // Step 1 — Node.js version check
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 20) {
    printYellow(
      `Warning: Node.js v${process.versions.node} detected. Node >= 20 is required.`
    );
    printYellow('Please upgrade: https://nodejs.org/');
    print('');
  } else {
    printGreen(`Node.js v${process.versions.node} — OK`);
    print('');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Step 2 — UE project path
  const detected = detectUEProject();
  let uprojectPath: string;

  if (detected) {
    printCyan(`Auto-detected UE project folder: ${detected}`);
    const confirm = await ask(rl, 'Is this correct? [Y/n] ');
    if (confirm.toLowerCase() === 'n') {
      uprojectPath = await ask(rl, 'Enter your UE project folder path: ');
    } else {
      uprojectPath = detected;
    }
  } else {
    printDim('No .uproject found in common locations.');
    uprojectPath = await ask(rl, 'Enter your UE project folder path (or press Enter to skip): ');
  }

  if (uprojectPath) {
    printGreen(`UE project path: ${uprojectPath}`);
  } else {
    printDim('Skipped UE project path — you can set UE_PROJECT_PATH env var later.');
  }
  print('');

  // Step 3 — Generate MCP config snippet
  const mcpConfig = {
    mcpServers: {
      'unreal-master-agent': {
        command: 'npx',
        args: ['-y', 'unreal-master-mcp-server'],
      },
    },
  };

  const configJson = JSON.stringify(mcpConfig, null, 2);
  const configPath = claudeConfigPath();

  print('── MCP Server Config ─────────────────────────────────────');
  print('');
  printCyan('Add the following to your claude_desktop_config.json:');
  print('');
  print(configJson);
  print('');
  printDim(`Default config location: ${configPath}`);
  print('');

  // Step 4 — Optionally write config
  const writeAnswer = await ask(
    rl,
    `Write this config to ${configPath}? [y/N] `
  );

  if (writeAnswer.toLowerCase() === 'y') {
    try {
      mergeClaudeConfig(configPath);
      printGreen(`Config written to: ${configPath}`);
    } catch (err) {
      printYellow(
        `Could not write config: ${err instanceof Error ? err.message : String(err)}`
      );
      printDim('Please paste the snippet above manually.');
    }
  } else {
    printDim('Skipped — paste the snippet above into your config manually.');
  }

  rl.close();
  print('');

  // Step 5 — Next steps
  print('── Next Steps ────────────────────────────────────────────');
  print('');
  printGreen('1. Start Unreal Editor');
  printGreen('2. Enable the "UnrealMasterAgent" plugin in your project');
  printGreen('3. The MCP server will connect automatically when you open Claude Desktop');
  print('');
  printDim('Documentation: https://jaguarcode.github.io/UnrealMasterAI/');
  print('');
}
