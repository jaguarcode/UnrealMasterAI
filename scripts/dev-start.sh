#!/bin/bash
# Start MCP server in development mode
set -e
cd "$(dirname "$0")/../mcp-server"
npm run build
node dist/index.js
