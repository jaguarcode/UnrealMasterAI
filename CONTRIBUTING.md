# Contributing to Unreal Master Agent

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- Unreal Engine 5.4+ (for plugin testing)
- Git

### Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   cd mcp-server
   npm install
   ```
3. Build the MCP server:
   ```bash
   npm run build
   ```
4. Run tests:
   ```bash
   npm run test
   ```

## How to Contribute

### Reporting Bugs

Use the [Bug Report](https://github.com/jaguarcode/UnrealMasterAI/issues/new?template=bug_report.yml) issue template.

### Suggesting Features

Use the [Feature Request](https://github.com/jaguarcode/UnrealMasterAI/issues/new?template=feature_request.yml) issue template.

### Submitting Pull Requests

1. Fork the repo and create your branch from `main`
2. Make your changes following our coding standards
3. Add or update tests as needed
4. Ensure all tests pass: `npm run test`
5. Ensure types check: `npm run typecheck`
6. Submit a pull request using our PR template

## Coding Standards

### TypeScript (MCP Server)

- Use TypeScript strict mode
- All tool parameters validated with Zod schemas
- No `console.log()` in server code — use stderr via the logger module
- Follow existing patterns in `mcp-server/src/tools/`

### Python Scripts

All Python scripts in `ue-plugin/Content/Python/uma/` follow a standard pattern:

```python
import unreal
from uma.utils import execute_wrapper, make_result, make_error, validate_path

@execute_wrapper
def execute(params):
    """Tool description."""
    # Validate inputs
    name = params.get('name', '')
    if not name:
        return make_error('INVALID_PARAMS', 'name is required')

    # Perform UE operations
    # ...

    return make_result({
        'success': True,
        'message': f'Operation completed for {name}'
    })
```

Key requirements:
- Always use the `@execute_wrapper` decorator
- Entry point is `execute(params)` — receives a dict of parameters
- Return `make_result(data)` for success or `make_error(code, message)` for failure
- Use `validate_path()` for any asset or file path parameters
- All UE API calls happen on the GameThread (handled by the decorator)

### Safety Classification

When adding tools that modify state, classify them in `mcp-server/src/state/safety.ts`:

- `SAFE_TOOLS` — Read-only operations (e.g., `editor-ping`, `content-listAssets`)
- `WARN_TOOLS` — Mutation operations (e.g., `actor-setProperty`, `material-setParameter`)
- `DANGEROUS_TOOLS` — Destructive operations (e.g., `actor-delete`, `asset-delete`)

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature or tool
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `chore:` — Maintenance, dependencies, CI
- `refactor:` — Code restructuring without behavior change
- `test:` — Adding or updating tests

Examples:
```
feat: add landscape-sculpt tool for terrain modification
fix: resolve actor-delete name mismatch with editor-listActors
docs: update API reference for material tools
chore: bump @modelcontextprotocol/sdk to 1.13.0
```

## How to Add a New Tool

See the detailed guide: [docs/adding-a-tool.md](docs/adding-a-tool.md)

Quick overview:
1. Create a Python script in `ue-plugin/Content/Python/uma/`
2. Create a TypeScript tool handler in `mcp-server/src/tools/<domain>/`
3. Register the tool in `mcp-server/src/server.ts` with Zod schema
4. Classify the tool in `mcp-server/src/state/safety.ts`
5. Write tests in `mcp-server/tests/unit/tools/<domain>/`
6. Update documentation

## Developer Certificate of Origin (DCO)

By contributing to this project, you agree to the Developer Certificate of Origin (DCO). This is a lightweight agreement that certifies you wrote or have the right to submit the code you are contributing.

You must sign off your commits:
```bash
git commit -s -m "feat: add new tool"
```

This adds a `Signed-off-by` line to your commit message.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
