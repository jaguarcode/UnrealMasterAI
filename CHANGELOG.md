# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Phase 1: OSS Foundation — governance files, CI pipeline, CHANGELOG, contributor guide

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

[Unreleased]: https://github.com/jaguarcode/UnrealMasterAI/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jaguarcode/UnrealMasterAI/releases/tag/v0.1.0
