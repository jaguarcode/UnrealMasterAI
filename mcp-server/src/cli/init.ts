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

// ── Host config types and registry ──────────────────────────────────────────

export interface HostConfig {
  name: string;
  displayName: string;
  configPath: (cwd: string) => string;
  generateConfig: () => Record<string, unknown>;
  description: string;
}

const standardMcpEntry = {
  command: 'npx',
  args: ['-y', 'unreal-master-mcp-server'],
};

export const HOST_CONFIGS: Record<string, HostConfig> = {
  claude: {
    name: 'claude',
    displayName: 'Claude Desktop',
    configPath: (_cwd: string) => claudeConfigPath(),
    generateConfig: () => ({
      mcpServers: {
        'unreal-master-agent': { ...standardMcpEntry },
      },
    }),
    description: 'Claude Desktop application (claude_desktop_config.json)',
  },
  'claude-code': {
    name: 'claude-code',
    displayName: 'Claude Code',
    configPath: (cwd: string) => path.join(cwd, '.mcp.json'),
    generateConfig: () => ({
      mcpServers: {
        'unreal-master-agent': { ...standardMcpEntry },
      },
    }),
    description: 'Claude Code editor extension (.mcp.json in project root)',
  },
  cursor: {
    name: 'cursor',
    displayName: 'Cursor',
    configPath: (cwd: string) => path.join(cwd, '.cursor', 'mcp.json'),
    generateConfig: () => ({
      mcpServers: {
        'unreal-master-agent': { ...standardMcpEntry },
      },
    }),
    description: 'Cursor editor (.cursor/mcp.json in project root)',
  },
  windsurf: {
    name: 'windsurf',
    displayName: 'Windsurf',
    configPath: (_cwd: string) =>
      path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
    generateConfig: () => ({
      mcpServers: {
        'unreal-master-agent': { ...standardMcpEntry },
      },
    }),
    description: 'Windsurf editor (~/.codeium/windsurf/mcp_config.json)',
  },
  vscode: {
    name: 'vscode',
    displayName: 'VS Code',
    configPath: (cwd: string) => path.join(cwd, '.vscode', 'mcp.json'),
    generateConfig: () => ({
      servers: {
        'unreal-master-agent': {
          type: 'stdio',
          ...standardMcpEntry,
        },
      },
    }),
    description: 'Visual Studio Code (.vscode/mcp.json in project root)',
  },
};

/** Extract --host=<name> from argv, defaulting to 'claude'. */
export function parseHost(argv: string[]): string {
  for (const arg of argv) {
    const match = arg.match(/^--host=(.+)$/);
    if (match) return match[1];
  }
  return 'claude';
}

/** Return all registered host configs (for testing / listing). */
export function getHostConfigs(): Record<string, HostConfig> {
  return HOST_CONFIGS;
}

// ── UE project detection ─────────────────────────────────────────────────────

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

/** Write config to the given path, merging into existing JSON if present. */
function writeConfig(configPath: string, config: Record<string, unknown>): void {
  let merged = config;

  if (fs.existsSync(configPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
      // For hosts that use mcpServers, merge rather than overwrite
      if ('mcpServers' in config && 'mcpServers' in existing) {
        merged = {
          ...existing,
          mcpServers: {
            ...(existing['mcpServers'] as Record<string, unknown>),
            ...(config['mcpServers'] as Record<string, unknown>),
          },
        };
      } else if ('servers' in config && 'servers' in existing) {
        merged = {
          ...existing,
          servers: {
            ...(existing['servers'] as Record<string, unknown>),
            ...(config['servers'] as Record<string, unknown>),
          },
        };
      }
    } catch {
      // start fresh if unparseable
    }
  }

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
}

// ── Main wizard ──────────────────────────────────────────────────────────────

export async function runInit(): Promise<void> {
  const host = parseHost(process.argv);
  const hostCfg = HOST_CONFIGS[host];

  if (!hostCfg) {
    print(`Unknown host: "${host}"`);
    print('');
    print('Supported hosts:');
    for (const cfg of Object.values(HOST_CONFIGS)) {
      print(`  --host=${cfg.name.padEnd(12)} ${cfg.description}`);
    }
    print('');
    process.exit(1);
  }

  print('');
  print('╔══════════════════════════════════════════════════════════╗');
  print('║       Unreal Master Agent — Setup Wizard                ║');
  print('╚══════════════════════════════════════════════════════════╝');
  print('');
  printCyan(`Host: ${hostCfg.displayName}`);
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

  const cwd = process.cwd();
  const configPath = hostCfg.configPath(cwd);
  const config = hostCfg.generateConfig();
  const configJson = JSON.stringify(config, null, 2);

  // Claude Desktop: run the full interactive wizard (UE project detection + path)
  if (host === 'claude') {
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

    // Step 3 — Show config
    print('── MCP Server Config ─────────────────────────────────────');
    print('');
    printCyan('Add the following to your claude_desktop_config.json:');
    print('');
    print(configJson);
    print('');
    printDim(`Default config location: ${configPath}`);
    print('');

    // Step 4 — Optionally write config
    const writeAnswer = await ask(rl, `Write this config to ${configPath}? [y/N] `);

    if (writeAnswer.toLowerCase() === 'y') {
      try {
        writeConfig(configPath, config);
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
  } else {
    // Non-claude hosts: streamlined flow — no UE project question
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Show config
    print('── MCP Server Config ─────────────────────────────────────');
    print('');
    printCyan(`Add the following to your ${hostCfg.displayName} MCP config:`);
    print('');
    print(configJson);
    print('');
    printDim(`Config location: ${configPath}`);
    print('');

    // Ask to write
    const writeAnswer = await ask(rl, `Write this config to ${configPath}? [y/N] `);

    if (writeAnswer.toLowerCase() === 'y') {
      try {
        writeConfig(configPath, config);
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

    // Next steps
    print('── Next Steps ────────────────────────────────────────────');
    print('');
    printGreen('1. Start Unreal Editor');
    printGreen('2. Enable the "UnrealMasterAgent" plugin in your project');
    printGreen(`3. The MCP server will connect automatically when you open ${hostCfg.displayName}`);
    print('');
    printDim('Documentation: https://jaguarcode.github.io/UnrealMasterAI/');
    print('');
  }
}
