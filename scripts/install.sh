#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "Installing Fino for Claude..."
echo "Project: $PROJECT_DIR"
echo ""

# --- Skills ---
echo "Installing skills..."
mkdir -p "$CLAUDE_DIR/skills"

for skill_dir in "$PROJECT_DIR/.claude/skills"/*/; do
  skill_name=$(basename "$skill_dir")
  target="$CLAUDE_DIR/skills/$skill_name"
  if [ -L "$target" ] || [ -d "$target" ]; then
    rm -rf "$target"
  fi
  ln -s "$skill_dir" "$target"
  echo "  /$skill_name"
done
echo ""

# --- MCP Server Config ---
MCP_JSON="$PROJECT_DIR/.mcp.json"
MCP_CONFIG="{\"mcpServers\":{\"fino\":{\"command\":\"npx\",\"args\":[\"tsx\",\"mcp/index.ts\"],\"cwd\":\"$PROJECT_DIR\"}}}"

echo "Configuring MCP for Claude Code..."
echo "$MCP_CONFIG" | node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
fs.writeFileSync('$MCP_JSON', JSON.stringify(data, null, 2) + '\n');
console.log('  Created $MCP_JSON');
"

echo ""
echo "Done. Restart Claude Code or Claude Desktop to pick up the changes."
echo ""
echo "Available slash commands:"
echo "  /snapshot        - Quick financial health check"
echo "  /monthly-report  - Detailed month-end report"
echo "  /spending-audit  - Find recurring charges and waste"
echo "  /find-charges    - Search for specific merchants"
echo "  /cash-flow       - Income vs expense trends"
echo "  /sync            - Force sync bank data"
