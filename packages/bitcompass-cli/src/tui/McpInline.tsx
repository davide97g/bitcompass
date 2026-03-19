import React from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';

const MCP_TOOLS = [
  'list-rules',
  'get-rule',
  'search-rules',
  'post-rules',
  'update-rule',
  'delete-rule',
  'pull-rule',
  'pull-group',
  'search-docs',
];

const CONFIG_SNIPPET = `{
  "mcpServers": {
    "bitcompass": {
      "command": "bitcompass",
      "args": ["mcp", "start"]
    }
  }
}`;

export const McpInline: React.FC = () => (
  <Box flexDirection="column" gap={1}>
    <Text bold color={theme.accent}>MCP Server Setup</Text>
    <Text dimColor>Add to claude_desktop_config.json:</Text>
    <Box borderStyle="round" borderColor="gray" paddingX={1}>
      <Text dimColor>{CONFIG_SNIPPET}</Text>
    </Box>
    <Text bold>Available tools:</Text>
    <Box flexDirection="column">
      {MCP_TOOLS.map((tool) => (
        <Text key={tool}>  <Text color={theme.accent}>•</Text> {tool}</Text>
      ))}
    </Box>
    <Text dimColor>Run: <Text color={theme.accent}>bitcompass mcp start</Text> to start the server</Text>
  </Box>
);
