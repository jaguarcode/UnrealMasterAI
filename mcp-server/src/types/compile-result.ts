/**
 * Types for compilation results from Live Coding / UnrealBuildTool.
 */

export type CompileSeverity = 'error' | 'warning' | 'note';
export type CompileStatus = 'pending' | 'compiling' | 'success' | 'failed';

export interface CompileError {
  file: string;
  line: number;
  column?: number;
  severity: CompileSeverity;
  message: string;
  code?: string;
}

export interface CompileResult {
  status: CompileStatus;
  duration_ms?: number;
  errors: CompileError[];
  warnings: CompileError[];
  patchCount?: number;
}
