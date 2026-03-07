# Unreal Master Agent — Future Improvement Plan & Open-Source Roadmap

**Date:** 2026-03-08
**Current Version:** 0.1.0 (MCP Server) / 0.0.0 (Root)
**Status:** Implementation Complete (Phase 0-15), Pre-Release

---

## Part 1: Current Implementation Analysis

### 1.1 Architecture Maturity Assessment

| Layer | Component | Maturity | Notes |
|-------|-----------|----------|-------|
| L1 | Claude Code (MCP Host) | Stable | External — not our code |
| L2 | MCP Bridge (Node.js/TS) | **High** | 183 tools registered in monolithic `server.ts` (~2000 lines), clean ToolRegistry with dynamic add/remove, Zod schemas |
| L3 | UE Plugin (C++) | **High** | 18 source files (9 .cpp + 9 .h). WebSocket client, Blueprint serializer/manipulator, Live Coding, Python bridge, Approval gate. GameThread dispatch correctly enforced. |
| L3.5 | Python Scripts | **High** | 154 scripts — 153/154 use `@execute_wrapper` consistently. But only 46/154 call `validate_path()` for input validation. |
| L4 | Engine APIs | N/A | UE internals — consumed, not owned |
| Cross | Context Intelligence | **Medium** | 9 files with mature intent matching (60+ synonym groups), multi-signal error similarity engine. But `learned-workflows.json` is empty and `error-resolutions.json` has placeholder data. Duplicated `tokenize()` function in `intent-matcher.ts` and `error-learning.ts`. |
| Cross | Testing | **High** | 928 tests across 54 files (50 unit + 4 integration). Vitest + v8 coverage provider. Zero Python script tests. |
| Cross | Documentation | **Medium** | Good architecture docs, but API reference stale (says 85 tools, actual 183). README references nonexistent `lint` script. Port number inconsistency between README and code. |

### 1.2 Strengths

- **Massive tool coverage**: 183 MCP tools across 37 domains — the most comprehensive UE MCP integration available
- **Clean codebase**: Zero TODO/FIXME/HACK markers in production code
- **Consistent patterns**: All 154 Python scripts follow `@execute_wrapper` / `execute(params)` / `make_result()` pattern
- **Self-healing architecture**: Compile error capture → parse → fix → retry loop (3 max)
- **Safety architecture**: Approval gate for destructive operations, file operation sandboxing
- **Context intelligence**: Self-learning system for intent matching, error recovery, and workflow optimization
- **Minimal dependencies**: Only 4 runtime deps (MCP SDK, ws, zod, uuid) — small attack surface
- **Solid test infrastructure**: Vitest with coverage support, unit + integration test separation
- **Polished landing page**: SEO-optimized GitHub Pages site with professional design
- **UE version range**: Supports 5.4 through 5.7

### 1.3 Weaknesses & Gaps

| Area | Issue | Severity |
|------|-------|----------|
| **OSS Governance** | No CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, issue/PR templates | Critical |
| **CI/CD** | `.github/workflows/` directory exists but is **empty** — no automated build, test, or release | Critical |
| **Port Inconsistency** | README uses `UMA_WS_PORT: "8765"` but code reads `UE_WS_PORT` defaulting to `9877`. First-time users will get broken setups. | Critical |
| **Python Code Injection** | `UMAPythonBridge.cpp:91` uses `r'''%s'''` for param interpolation — breaks/injects if JSON contains `'''` | High |
| **Versioning** | Three different versions: root `0.0.0`, mcp-server `0.1.0`, ARCHITECTURE.md `0.2.0`. No CHANGELOG.md, no git tags. | High |
| **npm Publishing** | `"private": true` — MCP server cannot be installed via `npm install -g`. No `bin`, `files`, or `engines` fields. | High |
| **API Docs Stale** | `docs/api-reference/mcp-tools.md` references 85 tools (actual: 183) | High |
| **Path Validation Gap** | Only 46/154 Python scripts call `validate_path()` — 108 scripts skip input validation | High |
| **Safety Gap** | `actor-setArrayRef` tool missing from safety classification in `safety.ts` (falls to default `warn`) | Medium |
| **Learning System Cold** | `learned-workflows.json` is empty; `error-resolutions.json` has placeholder data | Medium |
| **No Python Tests** | Zero test coverage for 154 Python scripts (require `unreal` module only available in UE runtime) | Medium |
| **No E2E Tests** | No automated tests that connect MCP server → UE plugin end-to-end | Medium |
| **TestProject Gitignored** | Referenced in docs but excluded from repo — contributors cannot reproduce dev environment | Medium |
| **README References** | `npm run lint` referenced but no ESLint config or lint script exists in `package.json` | Medium |
| **Cross-Platform** | No evidence of Mac/Linux testing. All example paths use Windows format. | Medium |
| **Trademark Risk** | "Unreal" is Epic Games' registered trademark — no disclaimer present | Medium |
| **Code Duplication** | `tokenize()` function duplicated identically in `intent-matcher.ts:103` and `error-learning.ts:121` | Low |
| **No Docker** | No containerized MCP server for easy deployment | Low |

---

## Part 2: Open-Source Growth Roadmap

### Phase 0: Critical Fixes (Pre-Release) — Immediate
> *Goal: Fix issues that break first-time setup or pose security risks*

- [ ] **Fix port inconsistency**: Standardize on `UE_WS_PORT` / `9877` everywhere. Update README quick-start (currently uses wrong env var `UMA_WS_PORT` with wrong port `8765`). Update `docs/coding-conventions/`.
- [ ] **Fix Python code injection**: Replace `r'''%s'''` interpolation in `UMAPythonBridge.cpp:91` with base64-encoded params or temp file approach to prevent breakage/injection when JSON contains `'''`.
- [ ] **Classify `actor-setArrayRef`**: Add to explicit `WARN_TOOLS` list in `safety.ts` instead of relying on default fallback.
- [ ] **Remove or implement `lint` script**: README references `npm run lint` but no ESLint config or script exists. Either add ESLint or remove the reference.
- [ ] **Harmonize version numbers**: Align root `package.json` (`0.0.0`), `mcp-server/package.json` (`0.1.0`), `.uplugin` (`0.1.0`), and `ARCHITECTURE.md` (`0.2.0`) to a single version.
- [ ] **Add `engines` field**: Add `"engines": { "node": ">=20.0.0" }` to `mcp-server/package.json`.
- [ ] **Extract shared `tokenize()`**: Deduplicate from `intent-matcher.ts:103` and `error-learning.ts:121` into a shared utility.
- [ ] **Add Epic trademark disclaimer**: "Unreal Engine is a trademark of Epic Games, Inc." in README footer.

### Phase 1: OSS Foundation (v0.2.0) — Weeks 1-2
> *Goal: Make the project ready for external contributors*

#### 1.1 Governance Files
- [ ] **CONTRIBUTING.md** — Fork/PR workflow, coding standards, Python script template (`@execute_wrapper` pattern), commit conventions, DCO/CLA decision, "How to add a new tool" guide
- [ ] **CODE_OF_CONDUCT.md** — Contributor Covenant v2.1
- [ ] **SECURITY.md** — Vulnerability reporting process (GitHub Security Advisories)
- [ ] **.github/ISSUE_TEMPLATE/** — Bug report, feature request, new tool proposal templates
- [ ] **.github/PULL_REQUEST_TEMPLATE.md** — Checklist (tests, docs, types, no TODOs, safety classification)

#### 1.2 CI/CD Pipeline
- [ ] **GitHub Actions: CI** — `npm install` → `typecheck` → `vitest run` → `npm audit` → coverage report on every PR
- [ ] **GitHub Actions: Build** — Build MCP server + verify C++ plugin compiles (UE build cache)
- [ ] **Branch protection** — Require CI pass + 1 review for `main`
- [ ] **Coverage badge** — Display test coverage in README
- [ ] **README badges** — License, npm version, Node version, UE version, test count

#### 1.3 Versioning & Releases
- [ ] **CHANGELOG.md** — Initialize with retroactive history of major milestones (Phases 0-15)
- [ ] Adopt **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`)
- [ ] **GitHub Actions: Release** — Auto-generate releases from tags, attach built artifacts
- [ ] Create first git tag (`v0.2.0`) after Phase 0 fixes

#### 1.4 Documentation Sync
- [ ] Update `docs/api-reference/mcp-tools.md` from 85 → 183 tools (auto-generate from tool-schemas.ts)
- [ ] Add tool count badge to README
- [ ] Create `docs/adding-a-tool.md` — Step-by-step guide for contributors adding new MCP tools
- [ ] Add OG image to `docs/index.html` (currently missing `og:image` meta tag)
- [ ] Add logo/branding assets to `docs/assets/`

### Phase 2: Distribution & DX (v0.3.0) — Weeks 3-5
> *Goal: One-command install for both MCP server and UE plugin*

#### 2.1 npm Package Publishing
- [ ] Remove `"private": true` from `mcp-server/package.json`
- [ ] Set `"bin"` entry for CLI startup: `"unreal-master": "dist/index.js"`
- [ ] Publish to npm as `unreal-master-mcp-server`
- [ ] Add `npx unreal-master-mcp-server` quick-start to README
- [ ] GitHub Actions: Auto-publish to npm on version tag

#### 2.2 UE Plugin Distribution
- [ ] Add Marketplace metadata to `.uplugin` (`MarketplaceURL`, `DocsURL`, `SupportURL`, `EngineVersion: "5.4.0"`)
- [ ] Add `SupportedTargetPlatforms` to `.uplugin` (Win64, Mac, Linux)
- [ ] Build script that produces a distributable plugin zip (per UE version)
- [ ] GitHub Releases: Attach prebuilt plugin zips for UE 5.4/5.5/5.6/5.7
- [ ] One-command install script: `install-plugin.sh <UE_PROJECT_PATH>`
- [ ] Investigate UE Marketplace submission requirements

#### 2.3 Developer Experience
- [ ] **Interactive setup wizard**: `npx unreal-master-mcp-server init` — generates `.claude/mcp.json`, validates prerequisites
- [ ] **Connection health dashboard**: `editor-ping` with detailed diagnostics on failure
- [ ] **Example project**: Minimal UE project with plugin pre-configured for onboarding
- [ ] **Video tutorial**: 5-min "zero to first tool call" walkthrough

### Phase 3: Robustness & Quality (v0.4.0) — Weeks 6-9
> *Goal: Production-grade reliability and observability*

#### 3.1 Testing Improvements
- [ ] **E2E test harness**: Headless UE instance + MCP server + automated tool call sequences
- [ ] **Python script tests**: pytest suite for all 154 scripts with mocked `unreal` module (currently ZERO Python test coverage)
- [ ] **Coverage gate**: Fail CI if coverage drops below 80% (vitest config already has v8 provider, just needs threshold)
- [ ] **Snapshot tests**: Lock tool schema outputs to detect unintended breaking changes
- [ ] **Fuzz testing**: Random input generation for tool parameter validation
- [ ] **Multi-UE-version CI matrix**: Test plugin build against UE 5.4 and 5.5 minimum (currently claimed 5.4-5.7 but unvalidated)

#### 3.2 Error Handling & Resilience
- [ ] **Structured error codes**: Replace string errors with typed error enum (e.g., `UMA_E_ACTOR_NOT_FOUND`)
- [ ] **WebSocket reconnection**: Auto-reconnect with exponential backoff when UE disconnects
- [ ] **Request timeout**: Configurable per-tool timeout (default 30s, long ops like cook: 300s)
- [ ] **Circuit breaker**: Disable tools after N consecutive failures, re-enable on successful ping

#### 3.3 Observability
- [ ] **Structured logging**: JSON log output with request IDs, tool names, latencies
- [ ] **Metrics export**: OpenTelemetry-compatible spans for tool execution tracing
- [ ] **Performance dashboard**: Track tool latency percentiles over time
- [ ] **Error rate alerting**: Webhook notification when error rate exceeds threshold

#### 3.4 Security Hardening
- [ ] **Python `validate_path()` audit**: Expand from 46/154 → all scripts that accept asset/file paths. Create `validate_and_load_asset()` helper combining validation with loading.
- [ ] **Input validation audit**: Verify all 183 tools validate inputs via Zod before execution on the TS side
- [ ] **Path traversal prevention**: Ensure file tools cannot escape project directory (already exists in `utils.py` but inconsistently applied)
- [ ] **WebSocket authentication**: Shared secret or token-based auth for WS connection (currently accepts any local connection)
- [ ] **Rate limiting**: Prevent tool call flooding (configurable per-minute limit)
- [ ] **Dependency audit**: Add `npm audit` to CI pipeline + Dependabot alerts
- [ ] **PythonScriptPlugin dependency**: Document requirement for "Python Editor Script Plugin" (not default in all UE distributions) with graceful error on missing

### Phase 4: Ecosystem & Extensibility (v0.5.0) — Weeks 10-14
> *Goal: Enable community-driven tool and workflow creation*

#### 4.1 Plugin Extension API & Refactoring
- [ ] **Refactor monolithic `server.ts`**: Split ~2000-line tool registration into auto-registration by domain directory scan (reduces merge conflicts, simplifies adding new tools)
- [ ] **Custom tool registration**: Allow users to drop `.ts` files in `custom-tools/` directory with auto-discovery
- [ ] **Tool hooks**: Pre/post execution hooks for logging, validation, transformation
- [ ] **Custom Python scripts**: Auto-discover user scripts in `Content/Python/uma_custom/`
- [ ] **Tool manifest endpoint**: `context-getManifest` returns all tools with schemas (already exists — document it)

#### 4.2 Workflow Marketplace
- [ ] **Workflow sharing format**: Standardized JSON schema for importable/exportable workflows
- [ ] **Community workflow repo**: GitHub repository of community-contributed workflow templates
- [ ] **Import CLI**: `npx unreal-master-mcp-server import-workflow <url>`
- [ ] **Workflow gallery**: Web page showcasing popular workflows with one-click install

#### 4.3 Multi-LLM Support
- [ ] Abstract MCP transport to support other LLM hosts (Cursor, Windsurf, VS Code + Copilot)
- [ ] Document integration with each supported host
- [ ] Test matrix: Claude Code + Cursor + Windsurf across UE 5.4-5.7

#### 4.4 Context Intelligence Maturation
- [ ] **Seed the learning system**: Pre-populate `learned-workflows.json` with 50+ common UE workflows
- [ ] **Outcome analytics dashboard**: Visualize workflow success rates, common errors, tool usage patterns
- [ ] **Cross-project learning**: Opt-in telemetry to aggregate anonymized workflow patterns
- [ ] **Recommendation engine**: Proactively suggest next tools based on current context

### Phase 5: Scale & Community (v1.0.0) — Weeks 15-20
> *Goal: Production release with active community*

#### 5.1 v1.0 Release Criteria
- [ ] All 183 tools have individual documentation with examples
- [ ] E2E test suite passes on UE 5.4, 5.5, 5.6, 5.7
- [ ] npm package published with stable API
- [ ] UE plugin downloadable from GitHub Releases
- [ ] Zero known security vulnerabilities
- [ ] CHANGELOG covers full history
- [ ] API stability guarantee (SemVer from v1.0 onward)

#### 5.2 Community Building
- [ ] **Discord server**: Channels for #general, #help, #showcase, #tool-development
- [ ] **"Good First Issue" labels**: Tag 20+ issues for newcomer contributors
- [ ] **Contributor showcase**: Highlight community contributions in README
- [ ] **Monthly release cadence**: Predictable release schedule with RC → stable pipeline
- [ ] **Conference talks**: Submit to Unreal Fest, GDC, and AI/ML conferences

#### 5.3 Advanced Features
- [ ] **Runtime play mode tools**: Interact with running game (not just editor)
- [ ] **Multi-project support**: Single MCP server controlling multiple UE instances
- [ ] **Blueprint visual diff**: Before/after visualization of Blueprint graph changes
- [ ] **Undo/redo integration**: Hook into UE transaction system for full undo support
- [ ] **Collaborative editing**: Multiple Claude Code sessions sharing one UE instance
- [ ] **Mac/Linux support**: Cross-platform UE plugin builds

#### 5.4 Sustainability
- [ ] **GitHub Sponsors**: Enable for maintainer funding
- [ ] **Corporate sponsorship tiers**: Logo placement on landing page + README
- [ ] **Maintainer onboarding**: Document project architecture decisions for new maintainers
- [ ] **Governance model**: Define decision-making process (BDFL → committee at scale)

---

## Part 3: Priority Matrix

```
                        HIGH IMPACT
                            |
         Phase 1: CI/CD    |    Phase 2: npm publish
         Phase 1: CONTRIB  |    Phase 2: Plugin dist
         Phase 1: Docs sync|    Phase 4: Extension API
                            |
   LOW EFFORT -------------|-------------- HIGH EFFORT
                            |
         Phase 1: Changelog |    Phase 3: E2E tests
         Phase 1: Versioning|    Phase 5: Multi-LLM
         Phase 3: Security  |    Phase 5: Runtime tools
                            |
                        LOW IMPACT
```

**Recommended execution order:**
1. **Phase 0 (Critical Fixes)** — Port inconsistency and Python injection must be fixed before any public release
2. Phase 1 (OSS Foundation) — Unblocks all external contributions
3. Phase 2.1 (npm publish) — Biggest single DX improvement
4. Phase 1.4 + Phase 4.4 seed — Docs sync + seed learning system
5. Phase 3.4 (Security) — Required before v1.0
6. Phase 2.2 (Plugin dist) — Removes biggest installation friction
7. Phases 3-5 in parallel streams

---

## Part 4: Key Metrics to Track

| Metric | Current | v0.5 Target | v1.0 Target |
|--------|---------|-------------|-------------|
| GitHub Stars | — | 500 | 2,000 |
| npm weekly downloads | 0 | 100 | 1,000 |
| Contributors | 1 | 5 | 20 |
| Open issues | — | <30 | <50 |
| Test coverage | ~80%* | 85% | 90% |
| Tool count | 183 | 200 | 220+ |
| Python scripts | 154 | 170 | 200+ |
| Learned workflows | 0 | 50 (seeded) | 100+ (organic) |
| Documented tools | ~85 | 183 | 220+ |
| Supported UE versions | 5.4-5.7 | 5.4-5.7 | 5.4-5.8 |
| Supported LLM hosts | 1 | 1 | 3+ |

*estimated — no coverage reporting in CI yet

---

## Part 5: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| UE API breaking changes across versions | High | High | Version-specific Python script variants, CI matrix testing |
| MCP protocol spec changes | Medium | High | Pin `@modelcontextprotocol/sdk` version, adapter layer |
| Single maintainer burnout | High | Critical | Phase 5.2 community building, Phase 5.4 governance model |
| Security vulnerability in WS transport | Medium | High | Phase 3.4 auth + Phase 1.2 `npm audit` in CI |
| Python code injection via PythonBridge | Medium | High | Phase 0 fix: base64 encode params or use temp file |
| Tool count overwhelms Claude context | Medium | Medium | Tool grouping, lazy registration, domain filtering |
| Python `unreal` module API instability | Medium | Medium | Wrapper utilities in `utils.py`, version-gated imports |
| Competitor releases (Epic official AI tools) | Medium | High | Differentiate on openness, extensibility, multi-LLM support |
| Doc-code drift worsening | High | Medium | Auto-generate API docs from source, CI doc tests |
| PythonScriptPlugin not available | Medium | Medium | Graceful error message + doc requirement. Not default in all UE distributions. |
| Stale learned data after codebase changes | Medium | Low | Add TTL/invalidation to `error-resolutions.json` and `workflow-outcomes.json` |
| Epic Games trademark claim | Low | High | Phase 0: Add trademark disclaimer to README |

---

## Part 6: Open Questions (Decisions Required)

| Question | Options | Recommendation |
|----------|---------|----------------|
| What is the canonical WebSocket port? | `8765` (README) vs `9877` (code) | Standardize on `9877` (matches actual code default) |
| Should TestProject be distributed? | Un-gitignore it vs. keep excluded | Create a minimal example project instead (lighter, focused on onboarding) |
| Which UE versions are actually validated? | 5.4 only (evidenced) vs. 5.4-5.7 (claimed) | Add CI matrix or remove unvalidated version claims |
| Is npm publishing a goal? | Yes → remove `"private": true` | Yes — biggest DX win. Add `bin`, `files`, `exports` fields. |
| Who is the legal copyright holder? | "IKHYEON KIM" (LICENSE) vs. "JaguarCode" (docs) vs. "Unreal Master Team" (landing page) | Standardize to one entity across all files |
| CLA or DCO for contributions? | CLA (strict) vs. DCO sign-off (lightweight) | DCO — lower friction for open-source contributors |
| Monolithic `server.ts` vs. auto-registration? | Keep explicit vs. scan domain dirs | Auto-registration — scales better as tool count grows past 200 |
