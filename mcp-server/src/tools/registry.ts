/**
 * MCP Tool Registry.
 * Manages tool registration (static + dynamic) for the MCP server.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }>;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /** Callback invoked whenever the tool set changes (add or remove). */
  onToolsChanged: (() => void) | null = null;

  /**
   * Register a tool. Throws if tool name already registered.
   */
  registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
    this.onToolsChanged?.();
  }

  /**
   * Add a tool at runtime by name and definition.
   * Alias for registerTool that accepts a flat name + definition object.
   * Throws if tool name already registered.
   */
  addTool(name: string, definition: Omit<ToolDefinition, 'name'>): void {
    this.registerTool({ name, ...definition });
  }

  /**
   * Remove a tool at runtime by name.
   * Returns true if removed, false if the tool was not found.
   */
  removeTool(name: string): boolean {
    const existed = this.tools.delete(name);
    if (existed) {
      this.onToolsChanged?.();
    }
    return existed;
  }

  /**
   * Get a specific tool by name.
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools.
   */
  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get the names of all registered tools.
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool is registered.
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}
