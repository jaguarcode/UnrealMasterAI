export interface RecoveryStrategy {
  errorType: string;
  description: string;
  suggestedTools: string[];
  steps: string[];
}

export const ERROR_RECOVERY_PATTERNS: Record<string, RecoveryStrategy> = {
  'compile-error': {
    errorType: 'compile-error',
    description: 'Blueprint or C++ compilation failed',
    suggestedTools: ['compilation-getErrors', 'compilation-trigger'],
    steps: [
      'Call compilation-getErrors to retrieve the full list of compile errors with line numbers',
      'Read the relevant source file or Blueprint graph to understand the error context',
      'Fix the identified issue in the source (incorrect type, missing include, bad pin connection)',
      'Call compilation-trigger to recompile and verify the fix resolves all errors',
      'If errors persist, repeat from step 1 with the updated error list',
    ],
  },

  'asset-not-found': {
    errorType: 'asset-not-found',
    description: 'A referenced asset path does not exist in the Content Browser',
    suggestedTools: ['content-findAssets', 'content-listAssets'],
    steps: [
      'Call content-findAssets with a fuzzy or partial version of the missing asset name',
      'Review results for assets with similar names that may have been renamed or moved',
      'If no close match is found, call content-listAssets on the expected parent directory',
      'Update the reference to point to the correct asset path found in search results',
      'If the asset is genuinely missing, it may need to be imported or created fresh',
    ],
  },

  'pin-connection-failure': {
    errorType: 'pin-connection-failure',
    description: 'Two Blueprint pins could not be connected due to type incompatibility',
    suggestedTools: ['blueprint-serialize'],
    steps: [
      'Call blueprint-serialize to read the current graph and inspect pin types on both nodes',
      'Identify the exact types of the source and target pins causing the failure',
      'Check if a conversion node exists for the type pair (e.g., float-to-int, object-to-interface)',
      'Insert the appropriate conversion or cast node between the two incompatible pins',
      'Reconnect: source pin → conversion node input, conversion node output → target pin',
      'If no conversion exists, reconsider the design: the source node may need to output a different type',
    ],
  },

  'blueprint-node-not-found': {
    errorType: 'blueprint-node-not-found',
    description: 'The requested Blueprint node class or function was not found',
    suggestedTools: ['project-getClassHierarchy'],
    steps: [
      'Call project-getClassHierarchy to search for classes related to the desired functionality',
      'Search the hierarchy for the correct node class name (check for renamed or moved functions)',
      'Verify the required module or plugin is enabled in the project (some nodes require plugins)',
      'Use the correct class name returned by the hierarchy search when calling blueprint-createNode',
      'If the node is from a plugin, ensure the plugin is listed in the project dependencies',
    ],
  },

  'permission-denied': {
    errorType: 'permission-denied',
    description: 'An operation was blocked by the project safety gate',
    suggestedTools: [],
    steps: [
      'The safety gate blocked this operation because it is outside the allowed scope',
      'Review which operations are permitted: the safety system restricts destructive or irreversible actions',
      'Identify a safe alternative that achieves the same goal without the restricted operation',
      'For asset deletion, consider moving to a temporary folder instead of permanently deleting',
      'For bulk edits, consider scoping the operation to a single asset first to verify correctness',
      'If the operation is genuinely required, consult the project owner to adjust safety configuration',
    ],
  },

  'asset-locked': {
    errorType: 'asset-locked',
    description: 'An asset is locked by source control and cannot be modified',
    suggestedTools: ['sourcecontrol-getStatus', 'sourcecontrol-checkout'],
    steps: [
      'Call sourcecontrol-getStatus to check the current lock state of the asset',
      'Verify no other user currently holds an exclusive lock on the file',
      'Call sourcecontrol-checkout to check out / acquire a write lock on the asset',
      'Retry the original operation that was blocked by the lock',
      'If checkout fails because another user holds the lock, coordinate with that user to release it',
    ],
  },

  'missing-dependency': {
    errorType: 'missing-dependency',
    description: 'An asset or module dependency required by an operation is missing',
    suggestedTools: ['asset-getReferences', 'content-findAssets', 'asset-import'],
    steps: [
      'Call asset-getReferences on the affected asset to identify all missing dependency paths',
      'For each missing path, call content-findAssets to search for the asset under a different location',
      'If the asset exists at a different path, update the reference to the correct location',
      'If the asset is truly missing from the project, call asset-import to bring it in from disk',
      'After resolving all missing dependencies, rerun the original operation',
      'Call compilation-trigger if any Blueprints were affected by the dependency change',
    ],
  },

  'material-compile-error': {
    errorType: 'material-compile-error',
    description: 'A material failed to compile due to incorrect node connections or invalid parameters',
    suggestedTools: ['material-getNodes', 'material-getParameters'],
    steps: [
      'Call material-getNodes to retrieve the full node graph and identify disconnected or invalid nodes',
      'Call material-getParameters to list all scalar and vector parameters and their current values',
      'Look for nodes with missing required inputs or type mismatches between connected pins',
      'Fix invalid parameter values that are out of range or of the wrong type',
      'Ensure all required inputs on the final output node (Base Color, Roughness, etc.) are connected',
      'Recompile the material and verify no errors remain in the output log',
    ],
  },
};

export function getRecoveryStrategy(
  errorType: string,
  context?: Record<string, unknown>,
): RecoveryStrategy | undefined {
  void context;
  return ERROR_RECOVERY_PATTERNS[errorType];
}

export function listRecoveryStrategies(): RecoveryStrategy[] {
  return Object.values(ERROR_RECOVERY_PATTERNS);
}
