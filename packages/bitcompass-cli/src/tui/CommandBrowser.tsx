import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { commandGroups, flattenCommands, type FlatCommand } from './commands.js';
import { theme } from './theme.js';

interface CommandBrowserProps {
  onSelect: (cmd: FlatCommand) => void;
  onQuit: () => void;
}

export const CommandBrowser: React.FC<CommandBrowserProps> = ({ onSelect, onQuit }) => {
  const flat = flattenCommands();
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((i) => (i > 0 ? i - 1 : flat.length - 1));
      return;
    }
    if (key.downArrow) {
      setCursor((i) => (i < flat.length - 1 ? i + 1 : 0));
      return;
    }
    if (key.return) {
      onSelect(flat[cursor]!);
      return;
    }
    if (key.escape || input === 'q') {
      onQuit();
      return;
    }
  });

  const selected = flat[cursor]!;

  return (
    <Box flexDirection="row" height={24}>
      {/* Left pane: command list */}
      <Box flexDirection="column" width="40%" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.accent}>Commands</Text>
        </Box>
        {commandGroups.map((group, gi) => {
          const groupFlat = flat.filter((f) => f.groupIndex === gi);
          return (
            <Box key={gi} flexDirection="column" marginBottom={1}>
              <Text dimColor bold>{group.label}</Text>
              {groupFlat.map((item) => {
                const isSelected = flat.indexOf(item) === cursor;
                return (
                  <Box key={`${item.groupIndex}-${item.commandIndex}`}>
                    <Text color={isSelected ? theme.accent : undefined} bold={isSelected}>
                      {isSelected ? '❯ ' : '  '}
                      {item.command.label}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          );
        })}
        <Box marginTop={1}>
          <Text dimColor>↑↓ navigate · Enter inspect · q quit</Text>
        </Box>
      </Box>

      {/* Right pane: preview */}
      <Box flexDirection="column" width="60%" paddingX={2} borderStyle="single" borderColor="gray">
        <Box marginBottom={1}>
          <Text bold color={theme.accent}>{selected.command.label}</Text>
        </Box>
        <Text wrap="wrap">{selected.command.description}</Text>

        {selected.command.args && selected.command.args.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold dimColor>Arguments:</Text>
            {selected.command.args.map((arg) => (
              <Text key={arg.name}>
                {'  '}
                <Text color={arg.required ? 'yellow' : 'green'}>
                  {arg.required ? `<${arg.name}>` : `[${arg.name}]`}
                </Text>
                {arg.required && <Text dimColor>  (required)</Text>}
              </Text>
            ))}
          </Box>
        )}

        {selected.command.options && selected.command.options.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold dimColor>Options:</Text>
            {selected.command.options.map((opt) => (
              <Text key={opt.flags}>
                {'  '}
                <Text color="cyan">{opt.flags}</Text>
                {opt.description && <Text dimColor>  {opt.description}</Text>}
              </Text>
            ))}
          </Box>
        )}

        {selected.command.inlineView === 'McpInline' && (
          <Box marginTop={1}>
            <Text dimColor>Press Enter to view MCP setup details</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
