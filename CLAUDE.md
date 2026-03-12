# Unreal Master Agent — Project Instructions

## Context-First Workflow (MANDATORY)

When responding to ANY developer request that involves Unreal Engine operations, you MUST follow this sequence:

### 1. Intent Matching (BEFORE executing any tool)
Always call `context-matchIntent` first with the developer's natural language request.
- This returns the optimal workflow, tool sequence, confidence score, and outcome history.
- If confidence >= 0.5, follow the recommended `suggestedToolSequence`.
- If confidence < 0.5, use your judgment but still reference the partial matches.
- If a workflow match includes `outcomeInfo`, prefer workflows with higher success rates.

### 2. Error Recovery (WHEN any tool call fails)
When a tool returns an error, immediately call `context-matchError` before attempting manual troubleshooting.
- This checks both built-in recovery strategies AND learned resolutions from past troubleshooting.
- Follow the `recommendation.steps` in order.
- Respect `recommendation.avoidActions` — these are dead-end approaches from past failures.
- If the recommendation has `confidence >= 0.4`, apply it directly.

### 3. Outcome Recording (AFTER completing a workflow)
After successfully completing a developer request that matched a workflow, call `context-recordOutcome`.
- Set `success: true` if the task completed as expected.
- Set `success: false` if the task failed or produced unexpected results.
- Include `toolsUsed` with the actual tools called during execution.
- This builds the outcome history that improves future recommendations.

### 4. Error Resolution Learning (AFTER fixing an error)
When you resolve an error through troubleshooting, call `context-recordResolution`.
- Capture the original error message and source tool.
- Document ALL attempted fixes (including failures — these prevent future dead ends).
- Record the successful fix with its tool sequence and step-by-step instructions.
- Provide a root cause analysis.
- This ensures the same error is resolved faster next time.

### 5. Workflow Learning (WHEN discovering new patterns)
When you discover a new effective workflow pattern not in the knowledge base:
- Call `context-learnWorkflow` to persist it.
- Include clear `intentPatterns` so future similar requests match it.
- Tag it with the relevant UE domain.

## Decision Flow

```
Developer Request
    │
    ▼
context-matchIntent(request)
    │
    ├── High confidence match → Follow suggestedToolSequence
    │       │
    │       ├── Tool succeeds → Continue sequence
    │       │       │
    │       │       └── All steps done → context-recordOutcome(success: true)
    │       │
    │       └── Tool fails → context-matchError(error)
    │               │
    │               ├── Resolution found → Apply fix → Continue
    │               │       │
    │               │       └── Fix works → context-markResolutionReused(id)
    │               │
    │               └── No match → Manual troubleshooting
    │                       │
    │                       └── Fixed → context-recordResolution(full details)
    │
    └── Low/no match → Execute with best judgment
            │
            └── Success → context-learnWorkflow(new pattern)
```

## Key Technical Constraints

1. **GameThread-only UE APIs.** Every UE editor API call MUST dispatch via `AsyncTask(ENamedThreads::GameThread, ...)`.
2. **stdout is sacred.** Never `console.log()` in MCP server code — use `stderr`.
3. **TryCreateConnection, never MakeLinkTo.** For Blueprint pin connections.
4. **UE is the WebSocket CLIENT.** Node.js listens; UE connects.
5. **Python scripts follow standard pattern.** `@execute_wrapper`, `execute(params)`, `make_result()`/`make_error()`.

## Project Stats
- **185 MCP tools** across 37 domains
- **1156 tests** across 69 test files
- **166 Python scripts** in `UnrealMasterAgent/Content/Python/uma/`
- **20 built-in workflows** from Epic's official documentation
- **60+ UE synonym groups** for intent matching
