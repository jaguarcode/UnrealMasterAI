# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them through [GitHub Security Advisories](https://github.com/jaguarcode/UnrealMasterAI/security/advisories/new).

### What to Include

- Type of issue (e.g., command injection, path traversal, WebSocket authentication bypass)
- Full paths of source file(s) related to the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix and disclosure**: Within 30 days for critical issues

### Known Security Considerations

- **WebSocket transport**: Currently accepts any local connection on the configured port. Authentication is planned for a future release.
- **Python script execution**: Scripts execute with full UE editor privileges. The `validate_path()` utility should be used for all file/asset path inputs.
- **File operations**: Sandboxed to the project directory via `utils.py` path validation.

## Security Best Practices for Users

1. Only run the MCP server on trusted local networks
2. Keep Node.js and dependencies updated
3. Review Python scripts before execution in production environments
4. Use the approval gate for destructive operations

## Attribution

This security policy is adapted from common open-source security policy templates.
