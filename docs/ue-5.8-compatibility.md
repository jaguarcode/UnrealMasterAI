# Unreal Engine 5.8 Compatibility Analysis

> Status: **Supported (5.4 – 5.8) as of v0.6.0.** The analysis below is the basis; run the adoption checklist when building on 5.8 in your environment.
> Analysis date: 2026-07-17 · UE 5.8.0 released 2026-06-17 (Epic's last planned major UE5 release).

This document records a full compatibility audit of the Unreal Master Agent stack
(C++ plugin, 166 Python scripts, Node.js MCP server) against Unreal Engine 5.8,
based on the official 5.8 release notes, the version-scoped Python API docs
(`application_version=5.8`), and a line-level inventory of every engine API this
project touches.

---

## Verdict by layer

| Layer | Risk | Finding |
|-------|------|---------|
| Python scripts (166) | **Very low** | Every `unreal.*` class used is present and callable in 5.8. Zero usage of methods newly deprecated in 5.8. Python 3.11.8 (unchanged); scripts are syntax-compatible down to 3.7. |
| Node MCP server | **None** | No engine-version-dependent code paths. Transport (WebSocket listener) is engine-agnostic. |
| C++ plugin runtime APIs | **Low** | All modules used (`WebSockets`, `UnrealEd`, `BlueprintGraph`, `KismetCompiler`, `LiveCoding`, `AssetRegistry`, Slate) are intact in 5.8 with no documented breaking changes to the specific APIs called. |
| C++ build/toolchain | **Moderate — real work** | 5.8 requires Visual Studio 2026 (MSVC v145) on Windows; host projects need `BuildSettingsVersion.V7` / `EngineIncludeOrderVersion.Unreal5_8` and a clean `Intermediate/`/`Binaries/` wipe. This affects anyone compiling the plugin, not the plugin source itself. |

**Bottom line:** no evidence of scripting-layer breakage; the migration cost is a
routine toolchain/compile pass. 5.8 support is declared as of v0.6.0 on the basis
of this analysis — run the adoption checklist at the end of this document when
building on 5.8 in your own environment.

---

## 1. Python API coverage (the "does 5.8 still have everything we call?" audit)

Aggregate usage was inventoried across `UnrealMasterAgent/Content/Python/uma/`
(166 scripts) and cross-checked against the 5.8 Python API docs.

### Churn-prone APIs we use — 5.8 status

| API | Uses | 5.8 status |
|-----|------|-----------|
| `unreal.EditorAssetLibrary` | 134 | Present. Long-deprecated (since ~5.0) in favor of `EditorAssetSubsystem`, **not removed** in 5.8. |
| `unreal.EditorLevelLibrary` | 76 (42 files) | Present. Same long-standing deprecation (→ `EditorActorSubsystem` / `LevelEditorSubsystem` / `UnrealEditorSubsystem`), **not removed** in 5.8. |
| `unreal.AssetToolsHelpers` | 39 | Present, no changes found. |
| `unreal.load_asset` / `load_object` / `load_class` | 80 | Present. |
| `unreal.SystemLibrary` | 18 | Present. 5.8 renames some methods (`box_overlap_actors_new` → `box_overlap_actors`, etc.) — **we use none of the renamed variants** (verified by grep). |
| `unreal.MaterialEditingLibrary` | 16 | Present. Only `get_used_textures` / `set_material_usage` deprecated — **we use neither**. |
| `unreal.get_editor_subsystem` / `get_engine_subsystem` | 20 | Present (modern pattern). |
| `unreal.UnrealEditorSubsystem` | 7 | Present. |
| GeometryScript / PCG / Landscape / Niagara / SubobjectDataSubsystem | ~30 | Present; no 5.8 changes documented for the entry points used. |
| `unreal.LevelSequenceEditorSubsystem` (`sequencer_open.py`) | 1 | Present. The 5.8 deprecations in `LevelSequenceEditorBlueprintLibrary` (`get_current_time` → playback-params variants, curve-editor moves) **do not affect us** — zero usage. |

### Newly-deprecated-in-5.8 method check

`grep` across all scripts for every method flagged as deprecated in the 5.8 docs
(`get_current_time`, `set_current_time`, `box_overlap_actors_new`,
`capsule_trace_multi_new`, `clear_timer_delegate`, `get_used_textures`,
`set_material_usage`, `sphere_overlap_actors_new`, `line_trace_multi_new`):
**zero matches.**

### Existing version tolerance

- 14 `hasattr(unreal, ...)` fallback guards (e.g. `BlueprintEditorLibrary` →
  `KismetSystemLibrary`) already protect the most historically unstable calls.
- Scripts use no Python syntax newer than 3.7 — safe on UE's bundled Python 3.11.8.

### Recommended (non-blocking) hardening

`EditorLevelLibrary` / `EditorAssetLibrary` have survived 7+ releases of
deprecation, and Epic's pattern for editor-scripting surfaces is
deprecate-but-don't-remove. Still, they are the single largest exposure
(210 combined call sites). A phased migration to
`EditorActorSubsystem` / `LevelEditorSubsystem` / `EditorAssetSubsystem` —
or a thin compatibility shim in `uma/utils.py` that resolves the subsystem when
available and falls back to the legacy library — would future-proof the layer
for UE6.

---

## 2. C++ plugin analysis

### APIs used vs 5.8

- **WebSockets**: `FWebSocketsModule::Get().CreateWebSocket(...)` — module intact
  in 5.8, no deprecation.
- **Blueprint editing**: `FBlueprintEditorUtils::MarkBlueprintAsModified`,
  `UEdGraphSchema_K2::TryCreateConnection`, `NewObject<UK2Node_*>` — no
  documented 5.7/5.8 changes.
- **Live Coding**: `ILiveCodingModule` (`GetOnPatchCompleteDelegate`,
  `IsEnabledForSession`, `EnableByDefault`, `Compile`) — properly guarded behind
  `WITH_LIVE_CODING`; no documented signature changes.
- **AssetRegistry / Slate / EditorSubsystem** usage — standard, stable surfaces.
- There are **no engine-version preprocessor guards** in the codebase; none are
  currently needed because no used API diverges across 5.4–5.8.

### Build/toolchain migration (the actual 5.8 work)

- Windows: **Visual Studio 2026 (MSVC v145)** required by 5.8; VS2022/v143 is
  rejected.
- Host projects must bump `Target.cs` to `BuildSettingsVersion.V7` and
  `EngineIncludeOrderVersion.Unreal5_8` (per-project, not per-plugin).
- Full wipe of `.vs/`, `Binaries/`, `Intermediate/`, `DerivedDataCache/`
  recommended when switching engine versions.

### Gaps found during this audit (and their disposition)

1. **`ueVersion` was documented but never emitted.** `docs/websocket-protocol.md`
   and the MCP `editor-ping` tool advertise a `ueVersion` field in the ping
   response, and `mcp-server/src/tools/editor/ping.ts` forwards it — but the C++
   handler only returned `status: "pong"`. **Fixed in this audit**: the ping
   handler now emits `FEngineVersion::Current().ToString(EVersionComponent::Patch)`
   (e.g. `"5.8.0"`). ⚠ This change is code-reviewed but **not yet
   compile-verified in an editor build** — it uses only long-stable APIs
   (`Misc/EngineVersion.h`).
2. **`.uplugin` has no `EngineVersion` field**, although CHANGELOG/ROADMAP claim
   one was added. Left as-is deliberately: for a source-distributed multi-version
   plugin (5.4–5.8), pinning `EngineVersion` triggers rebuild prompts on every
   other engine version. The historical claim should be treated as inaccurate.
3. **No layer detects the connected engine version.** With gap #1 fixed, the MCP
   server receives the live version on ping — future version-aware behavior
   (e.g. per-version workflow hints) can build on it.

---

## 3. Epic's first-party MCP plugin in 5.8 (strategic note)

UE 5.8 ships an **experimental first-party `ModelContextProtocol` plugin**
("Unreal MCP"): HTTP + SSE transport only (no stdio/WebSocket), default
`http://127.0.0.1:8000/mcp`, GameThread-serial tool execution, Python/C++
toolsets auto-discovered from `Content/Python/`.

- **No conflict** with Unreal Master Agent: different protocol (HTTP/SSE vs raw
  WebSocket), different connection direction (server-in-editor vs UE-as-client),
  different port.
- It validates this project's architecture (GameThread-only dispatch is also
  Epic's design) and the MCP-for-UE category overall.
- Differentiation to emphasize: 190 curated tools, the self-growing workflow
  intelligence layer, multi-version support (5.4+ vs 5.8-only), and self-healing
  compile loops.

---

## 4. Adoption checklist when moving a project to 5.8

- [ ] Compile `UnrealMasterAgent` in a UE 5.8 host project (Windows: VS2026/v145;
      macOS/Linux: default 5.8 toolchains) — confirms the ping `ueVersion` change.
- [ ] Launch editor, confirm plugin loads and the WebSocket client connects.
- [ ] `editor-ping` returns `ueVersion: "5.8.0"`.
- [ ] Run the Python script suite headless against 5.8
      (`-run=pythonscript` or the existing `Content/Python/tests/`).
- [ ] Smoke-test the churn-prone flows: Blueprint node create/connect,
      Live Coding trigger, sequencer open, landscape info, PCG graph info.
- [ ] README/docs version badges already reflect "5.4 – 5.8" as of v0.6.0 — no further action needed unless you're validating a downstream fork.

## Sources

- [UE 5.8 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes)
- [UE 5.8 announcement](https://www.unrealengine.com/news/unreal-engine-5-8-is-now-available)
- [Python API, application_version=5.8 class pages](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/)
- [FWebSocketsModule (5.8)](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/WebSockets/FWebSocketsModule)
- [Unreal MCP in Unreal Editor (official)](https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor)
- [Migrating C++ projects from 5.7 to 5.8 (community migration notes)](https://jakubpradeniak.com/posts/dev-notes/migrating-unreal-engine-5-8-cpp-project/)
