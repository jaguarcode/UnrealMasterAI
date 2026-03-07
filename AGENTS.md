<!-- Generated: 2026-02-25 | Updated: 2026-03-06 -->

# Unreal Master — Root

## Purpose

Autonomous AI agent that gives Claude Code bidirectional control over Unreal Engine
internals. 4-layer architecture: Claude Code → MCP Bridge Server (Node.js/TS) →
UE Agent Plugin (C++) → Engine APIs (UEdGraph, Slate, ILiveCodingModule).

## Repository Layout

| Path | Layer | Description |
|------|-------|-------------|
| `mcp-server/` | Layer 2 | Node.js/TypeScript MCP bridge server (183 tools, 826 tests) |
| `ue-plugin/` | Layer 3 | C++ Unreal Engine plugin + 154 Python automation scripts |
| `TestProject/` | — | UE5 test project with gameplay classes (PatrollingActor, etc.) |
| `docs/` | — | API reference, protocol spec, schemas, Slate RAG templates, guides |
| `README.md` | — | Setup instructions and development workflow |
| `docs/FULL-UE-PYTHON-API-ENHANCEMENT-PLAN.md` | — | Python API enhancement plan |

## Key Technical Constraints

1. **GameThread-only UE APIs.** Every UE editor API call MUST be dispatched via
   `AsyncTask(ENamedThreads::GameThread, ...)`. WebSocket callbacks run on a
   background thread. Violating this rule causes crashes and data corruption.

2. **stdout is sacred.** The MCP server communicates with Claude Code over stdout
   via JSON-RPC. `console.log()` in server code corrupts the stream. All logging
   goes to `stderr`.

3. **TryCreateConnection, never MakeLinkTo.** For Blueprint pin connection, always
   use `UEdGraphSchema_K2::TryCreateConnection()`. `MakeLinkTo` bypasses schema
   validation and corrupts Blueprint graphs.

4. **UE is the WebSocket CLIENT.** Node.js listens; UE connects. This uses UE's
   stable `FWebSocketsModule` client.

## For AI Agents

### TDD Workflow

All code changes start with failing tests.

- **TS tests:** `cd mcp-server && npm test` (Vitest)
- **C++ tests:** UE Automation Framework via `-ExecCmds="Automation RunTests ..."`
- **Commit format:** `feat: [description] (TDD)`

### Error Code Taxonomy

| Range | Category | Key Codes |
|-------|---------|-----------|
| 1000–1099 | Connection / WebSocket | Disconnect, handshake failure, timeout |
| 2000–2099 | Handler routing | Unknown method (2001) |
| 3000–3099 | Parameter validation | Missing required parameter (3001) |
| 4000–4099 | Blueprint operations | Spawn failed (4001), connect failed (4002), delete failed (4003), modify failed (4004) |
| 5000–5099 | Internal / compilation | Serialization error (5000), Live Coding init (5001–5004) |
| 6000–6099 | Safety gate | Not initialized (6000), rejected/timeout (6001) |
| 7000–8999 | Extended domains | Sequencer, AI, widget, texture, niagara, audio, landscape, physics, world partition, foliage, curve, PCG, geoscript |
| 9000–9099 | Workflow orchestration | Workflow template errors |
| 9100–9199 | Analysis / refactor | Blueprint complexity, asset health, rename chain |
| 9200–9299 | Context intelligence | Auto-gather, manifest, tool chains, error recovery |

### WS Message Envelope

Request (MCP → UE):
```json
{ "id": "<uuid>", "method": "blueprint.serialize",
  "params": { "blueprintPath": "/Game/BP_Test" }, "timestamp": 1740441600000 }
```

Response (UE → MCP):
```json
{ "id": "<uuid>", "result": { ... }, "duration_ms": 42 }
```

### MCP Tools (183 registered across 37 domains)

| Domain | Tools |
|--------|-------|
| Editor | `editor-ping`, `editor-getLevelInfo`, `editor-listActors`, `editor-getAssetInfo` |
| Blueprint | `blueprint-serialize`, `blueprint-createNode`, `blueprint-connectPins`, `blueprint-modifyProperty`, `blueprint-deleteNode` |
| Compilation | `compilation-trigger`, `compilation-getStatus`, `compilation-getErrors`, `compilation-selfHeal` |
| File | `file-read`, `file-write`, `file-search` |
| Slate | `slate-validate`, `slate-generate`, `slate-listTemplates` |
| Chat | `chat-sendMessage` |
| Actor | `actor-spawn`, `actor-delete`, `actor-getProperties`, `actor-setProperty`, `actor-setTransform`, `actor-getComponents`, `actor-addComponent`, `actor-select`, `actor-setArrayRef` |
| Material | `material-create`, `material-createInstance`, `material-setParameter`, `material-getParameters`, `material-getNodes`, `material-setTexture` |
| Mesh | `mesh-getInfo`, `mesh-setMaterial`, `mesh-setLOD`, `mesh-generateCollision` |
| Level | `level-create`, `level-open`, `level-save`, `level-addSublevel`, `level-getWorldSettings` |
| Asset | `asset-create`, `asset-delete`, `asset-duplicate`, `asset-import`, `asset-export`, `asset-rename`, `asset-getReferences`, `asset-setMetadata` |
| Animation | `anim-listSequences`, `anim-listMontages`, `anim-createMontage`, `anim-getBlendSpace`, `anim-getSkeletonInfo` |
| Content | `content-listAssets`, `content-findAssets`, `content-getAssetDetails`, `content-validateAssets` |
| DataTable | `datatable-create`, `datatable-addRow`, `datatable-getRows`, `datatable-removeRow` |
| Build | `build-lightmaps`, `build-cookContent`, `build-getMapCheck` |
| Project | `project-getStructure`, `project-getPlugins`, `project-getSettings`, `project-getClassHierarchy`, `project-getDependencyGraph`, `project-snapshot` |
| Gameplay | `gameplay-getGameMode`, `gameplay-setGameMode`, `gameplay-listInputActions`, `gameplay-addInputAction` |
| Python | `python-execute` (runs named scripts from `Content/Python/uma/`) |
| Source Control | `sourcecontrol-getStatus`, `sourcecontrol-checkout`, `sourcecontrol-diff` |
| Debug | `debug-execConsole`, `debug-getLog`, `debug-getPerformance` |
| Sequencer | `sequencer-createSequence`, `sequencer-addTrack`, `sequencer-setKeyframe`, `sequencer-getSequenceInfo`, `sequencer-renderMovie` |
| AI | `ai-createBehaviorTree`, `ai-addBTNode`, `ai-createBlackboard`, `ai-addBBKey`, `ai-getNavMesh`, `ai-createEQS` |
| Widget | `widget-createWidget`, `widget-addChild`, `widget-setProperty`, `widget-bindEvent`, `widget-getHierarchy` |
| Texture | `texture-import`, `texture-setCompression`, `texture-createRenderTarget`, `texture-getInfo` |
| Niagara | `niagara-createSystem`, `niagara-addEmitter`, `niagara-setParameter`, `niagara-getSystemInfo` |
| Audio | `audio-import`, `audio-createSoundCue`, `audio-createMetaSound`, `audio-getInfo`, `audio-setAttenuation` |
| Landscape | `landscape-create`, `landscape-importHeightmap`, `landscape-setMaterial`, `landscape-getLayers`, `landscape-sculptLayer` |
| Physics | `physics-createAsset`, `physics-setProfile`, `physics-addConstraint`, `physics-getInfo` |
| World Partition | `worldpartition-getInfo`, `worldpartition-addDataLayer`, `worldpartition-setHLOD`, `worldpartition-streamCells` |
| Foliage | `foliage-addType`, `foliage-setDensity`, `foliage-getTypes`, `foliage-setProperties` |
| Curve | `curve-create`, `curve-addKey`, `curve-getKeys` |
| PCG | `pcg-createGraph`, `pcg-addNode`, `pcg-connectNodes`, `pcg-getGraphInfo` |
| GeoScript | `geoscript-execute`, `geoscript-getInfo` |
| Workflow | `workflow-createCharacter`, `workflow-createUIScreen`, `workflow-setupLevel`, `workflow-createInteractable`, `workflow-createProjectile`, `workflow-setupMultiplayer`, `workflow-createInventorySystem`, `workflow-createDialogueSystem` |
| Analyze | `analyze-blueprintComplexity`, `analyze-assetHealth`, `analyze-performanceHints`, `analyze-codeConventions` |
| Refactor | `refactor-renameChain` |
| Context | `context-autoGather`, `context-getManifest`, `context-getChains`, `context-learnWorkflow`, `context-matchIntent`, `context-getWorkflows`, `context-recordOutcome`, `context-learnFromDocs`, `context-getOutcomeStats`, `context-recordResolution`, `context-matchError`, `context-markResolutionReused`, `context-listResolutions` |

### Subdirectory AGENTS.md

| File | Purpose |
|------|---------|
| `mcp-server/AGENTS.md` | MCP Bridge Server docs |
| `ue-plugin/AGENTS.md` | UE Plugin docs |
| `docs/AGENTS.md` | Documentation index and RAG knowledge base docs |

<!-- MANUAL: Custom project notes can be added below -->
