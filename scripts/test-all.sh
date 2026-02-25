#!/bin/bash
# Run all test suites
set -e
echo "Running MCP Server tests..."
cd "$(dirname "$0")/../mcp-server"
npx vitest run
echo "All tests passed!"
