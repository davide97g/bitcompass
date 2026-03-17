import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { commandGroups, flattenCommands, type FlatCommand } from './commands.js';
import { theme } from './theme.js';

interface CommandBrowserProps {
  onSelect: (cmd: FlatCommand) => void;
  onQuit: () => void;
}

// Build a flat list of items (headers + commands) for rendering
type ListItem =
  | { kind: 'header'; label: string; flatIndex: -1 }
  | { kind: 'command'; flat: FlatCommand; flatIndex: number };

function buildListItems(): ListItem[] {
  const flat = flattenCommands();
  const items: ListItem[] = [];
  let lastGroupIndex = -1;

  for (const f of flat) {
    if (f.groupIndex !== lastGroupIndex) {
      items.push({
        kind: 'header',
        label: commandGroups[f.groupIndex]!.label,
        flatIndex: -1,
      });
      lastGroupIndex = f.groupIndex;
    }
    items.push({ kind: 'command', flat: f, flatIndex: flat.indexOf(f) });
  }

  return items;
}

const VIEWPORT_HEIGHT = 18;

export const CommandBrowser: React.FC<CommandBrowserProps> = ({ onSelect, onQuit }) => {
  const flat = flattenCommands();
  const listItems = buildListItems();
  const [cursor, setCursor] = useState(0); // index into flat[]
  const [scrollTop, setScrollTop] = useState(0); // index into listItems[]

  const moveCursor = (delta: number) => {
    setCursor((prev) => {
      const next = Math.max(0, Math.min(flat.length - 1, prev + delta));

      // Find where this cursor sits in listItems and adjust scrollTop
      const cmdItems = listItems.filter((i) => i.kind === 'command');
      const cmdItemIdx = listItems.findIndex(
        (i) => i.kind === 'command' && (i as { kind: 'command'; flatIndex: number }).flatIndex === next
      );

      setScrollTop((st) => {
        if (cmdItemIdx < st) return cmdItemIdx;
        if (cmdItemIdx >= st + VIEWPORT_HEIGHT) return cmdItemIdx - VIEWPORT_HEIGHT + 1;
        return st;
      });

      return next;
    });
  };

  useInput((input, key) => {
    if (key.upArrow) { moveCursor(-1); return; }
    if (key.downArrow) { moveCursor(1); return; }
    if (key.return) { onSelect(flat[cursor]!); return; }
    if (key.escape || input === 'q') { onQuit(); return; }
  });

  const selected = flat[cursor]!;
  const visibleItems = listItems.slice(scrollTop, scrollTop + VIEWPORT_HEIGHT);
  const canScrollUp = scrollTop > 0;
  const canScrollDown = scrollTop + VIEWPORT_HEIGHT < listItems.length;

  return (
    <Box flexDirection="row">
      {/* Left pane: scrollable command list */}
      <Box flexDirection="column" width={36} paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.accent}>Commands</Text>
          {canScrollUp && <Text dimColor> ^</Text>}
        </Box>

        {visibleItems.map((item, i) => {
          if (item.kind === 'header') {
            return (
              <Box key={`h-${i}`}>
                <Text dimColor>{'-- '}{item.label.replace(/^[^ ]+ /, '')}{' --'}</Text>
              </Box>
            );
          }
          const isSelected = item.flatIndex === cursor;
          return (
            <Box key={`c-${item.flatIndex}`}>
              <Text
                color={isSelected ? theme.accent : undefined}
                bold={isSelected}
                wrap="truncate"
              >
                {isSelected ? '> ' : '  '}
                {item.flat.command.label}
              </Text>
            </Box>
          );
        })}

        {canScrollDown && (
          <Box>
            <Text dimColor> v more...</Text>
          </Box>
        )}

        <Box marginTop={1}>
          <Text dimColor>up/down nav  enter inspect  q quit</Text>
        </Box>
      </Box>

      {/* Right pane: preview */}
      <Box flexDirection="column" flexGrow={1} paddingX={2} borderStyle="single" borderColor="gray">
        <Box marginBottom={1}>
          <Text bold color={theme.accent} wrap="truncate">{selected.command.label}</Text>
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
                {arg.required && <Text dimColor>  required</Text>}
              </Text>
            ))}
          </Box>
        )}

        {selected.command.options && selected.command.options.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold dimColor>Options:</Text>
            {selected.command.options.map((opt) => (
              <Text key={opt.flags} wrap="truncate">
                {'  '}
                <Text color="cyan">{opt.flags}</Text>
                {opt.description && <Text dimColor>  {opt.description}</Text>}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
