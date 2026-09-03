
#!/bin/

# Define the target file path
TARGET_FILE="$HOME/.omlx/mcp.json"

# Ensure the directory exists
mkdir -p "$(dirname "$TARGET_FILE")"

# Write the JSON content to the file
cat > "$TARGET_FILE" << EOF
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@brave/brave-search-mcp-server", "--transport", "stdio"]
    }
  }
}
EOF

echo "Successfully created $TARGET_FILE"
