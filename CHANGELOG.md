# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Phase 4.4: Context Intelligence Maturation
  - Seeded 68 learned workflows across 36 domains (89 total with 21 builtin)
  - Seeded 25 error resolutions covering real UE error patterns
  - Proactive recommendation engine (`context-recommend`) based on workflow step adjacency
  - Analytics dashboard (`docs/analytics.html`) with CLI snapshot generation (`npx unreal-master-mcp-server analytics`)
  - Test isolation: backup/restore for production data files in 4 test files
- Phase 1: OSS Foundation — governance files, CI pipeline, CHANGELOG, contributor guide

### Changed
- Updated all documentation to reflect current stats: 188 tools, 166 Python scripts, 1228 tests across 73 files
- Tool count: 185 → 188 (added context-recommend, context-exportWorkflow, context-importWorkflow)
- Added Phase 16 (Plugin Extension API) to README roadmap table

## [0.5.0] — 2026-03-10

### Added
- Plugin Extension API with auto-registration architecture
- ToolModule interface for declarative tool definitions
- ToolHookManager for pre/post execution hooks
- Custom tool discovery from `custom-tools/` directory
- Custom Python script support via `Content/Python/uma_custom/`
- `python-customExecute` and `python-listCustomScripts` tools

### Changed
- Refactored server.ts from 1490 to 158 lines (89% reduction)
- Tool registrations moved to domain-specific index.ts files (37 domains)
- Upgraded tool count from 183 to 185
- Test count increased from 1134 to 1156 across 69 files

## [0.4.3] — 2026-03-09

### Added
- **WebSocket authentication**: `WS_AUTH_SECRET` env var enables shared-secret auth with `x-uma-auth-token` header. Uses `crypto.timingSafeEqual` via HMAC normalization to prevent timing attacks
- **Rate limiting**: `RateLimiter` class with sliding-window enforcement. `RATE_LIMIT_PER_MINUTE` env var configures global limit (default: 0 = disabled). Wraps all 183 tools automatically
- **Enhanced path traversal prevention**: `isPathSafe()` now blocks null bytes, URL-encoded traversals, double-encoded patterns, and UNC paths. New `isAssetPathSafe()` validates UE content roots
- **Asset path validation in safety gate**: `classifyOperation()` scans 14 asset path parameter keys and flags unsafe paths as dangerous before tool execution
- **Input validation audit test**: 9 tests verify all 183 tools have Zod input schemas
- **Python `validate_and_load_asset()` helper**: Combines path validation with asset loading in one call
- **PythonScriptPlugin documentation**: Setup guide updated with enabling steps, verification, and troubleshooting
- **`npm run audit:security`**: Dependency audit script for CI pipeline

### Changed
- Test count: 1063 → 1134 tests across 66 files (was 62)

## [0.4.2] — 2026-03-09

### Added
- **Structured JSON logging**: `createLogger()` supports `'json'` format with `LOG_FORMAT=json` env var. `withContext()` returns child logger with pre-filled requestId/toolName/durationMs fields
- **OpenTelemetry-compatible tracing**: W3C traceId (32-hex) and spanId (16-hex), `exportSpans()` returns OTLP-format payload with nanosecond timestamps and typed attributes
- **Performance dashboard**: `MetricsCollector.getPerformanceSummary()` returns all tools sorted by call count with p50/p95/p99 latency percentiles and aggregate stats
- **Error rate alerting**: `AlertManager` class with sliding-window error rate tracking, configurable cooldown, and fire-and-forget webhook POST via `ALERT_WEBHOOK_URL`

### Changed
- Test count: 999 → 1063 tests across 62 files (was 59)

## [0.4.1] - 2026-03-08

### Added
- **Structured error codes**: `ErrorCode` enum with 13 typed `UMA_E_*` codes, `UMAError` class with `toJSON()`, `createToolError()` and `formatBridgeError()` helpers (`src/errors.ts`)
- **Per-tool request timeout**: `getToolTimeout()` returns 300s for 16 long-running tools (build, workflow, import, landscape), 30s for all others (`src/transport/tool-timeouts.ts`)
- **Circuit breaker**: `CircuitBreaker` class with configurable failure threshold (default 5) and cooldown period (default 60s), auto-transitions through closed → open → half-open states (`src/state/circuit-breaker.ts`)
- **WebSocket reconnection tracking**: `ConnectionManager` now tracks `disconnectCount`, `lastDisconnectedAt`, `lastConnectedAt` with `getStats()` and `resetStats()` methods
- 27 new tests: circuit breaker (11), connection manager (9), tool timeouts (7)

### Changed
- `WebSocketBridge.sendRequest()` now accepts optional `timeoutMs` parameter for per-request timeout override
- `editorPing()` now accepts optional `CircuitBreaker` parameter and resets it on successful pong
- `actorSpawn`, `blueprintSerialize`, `materialCreate` handlers now use structured `UMAError` error responses instead of raw string errors
- WebSocket bridge logs reconnection events with disconnect count on connect/disconnect

## [0.4.0] - 2026-03-08

### Added
- **Coverage gate**: Vitest v8 coverage thresholds enforced in CI (lines/functions/statements: 80%, branches: 75%)
- **Snapshot tests**: Tool schema snapshots lock 183 tool names, domain mappings, and safety classifications
- **Fuzz testing**: 143 fuzz tests with 11 input vectors across 10 tool handlers
- **Python script tests**: pytest suite with mocked `unreal` module — 58 tests covering utils.py, actor_spawn.py, material_create.py, level_create.py, asset_create.py
- npm package README with badges, quick-start, architecture diagram

## [0.1.0] - 2026-03-08

### Added
- 183 MCP tools across 37 domains for bidirectional Unreal Engine control
- 154 Python automation scripts with `@execute_wrapper` pattern
- Context intelligence system: intent matching (60+ UE synonym groups), error learning, workflow outcomes
- 20 built-in workflows from Epic's official documentation
- Safety classification system (SAFE/WARN/DANGEROUS) with approval gate
- Self-healing compilation loop (parse errors, fix, retry up to 3x)
- Blueprint graph serialization, node creation, pin connection via C++
- WebSocket transport (Node.js server, UE plugin client)
- Comprehensive test suite: 826 tests across 54 files (Vitest + v8 coverage)
- Developer landing page with SEO optimization

### Fixed
- Port inconsistency: standardized on `UE_WS_PORT` / `9877` across all docs
- Python code injection: replaced raw string interpolation with base64 encoding in `UMAPythonBridge.cpp`
- Safety gap: `actor-setArrayRef` added to `WARN_TOOLS` classification
- Version harmonization: all components aligned to `0.1.0`
- Removed stale `npm run lint` reference from README
- Extracted shared `tokenize()` utility (was duplicated in intent-matcher and error-learning)

### Added (Distribution)
- npm package preparation: `bin`, `files`, `keywords`, `repository`, `engines` fields
- Plugin distribution scripts: `scripts/build-plugin.sh`, `scripts/install-plugin.sh`
- GitHub Actions: `npm-publish.yml` (auto-publish on version tag), `release.yml` (GitHub Releases with plugin artifacts)
- UE plugin metadata: `DocsURL`, `SupportURL`, `EngineVersion`, `SupportedTargetPlatforms`
- README: npx quick-start, troubleshooting guide, install-plugin reference
- Epic Games trademark disclaimer

[Unreleased]: https://github.com/jaguarcode/UnrealMasterAI/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/jaguarcode/UnrealMasterAI/compare/v0.4.3...v0.5.0
[0.4.3]: https://github.com/jaguarcode/UnrealMasterAI/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/jaguarcode/UnrealMasterAI/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/jaguarcode/UnrealMasterAI/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/jaguarcode/UnrealMasterAI/compare/v0.1.0...v0.4.0
[0.1.0]: https://github.com/jaguarcode/UnrealMasterAI/releases/tag/v0.1.0
