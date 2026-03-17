import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { TuiCommand, TuiArg, TuiOption } from './types.js';
import { theme } from './theme.js';
import { McpInline } from './McpInline.js';

interface CommandInspectProps {
  command: TuiCommand;
  onRun: (argv: string[]) => void;
  onBack: () => void;
}

type FieldValue = string | boolean;

interface Field {
  id: string;
  type: 'arg' | 'boolean-option' | 'string-option';
  label: string;
  value: FieldValue;
  required: boolean;
  flagName?: string;
}

function buildFields(command: TuiCommand): Field[] {
  const fields: Field[] = [];

  (command.args ?? []).forEach((arg: TuiArg) => {
    fields.push({
      id: `arg:${arg.name}`,
      type: 'arg',
      label: arg.required ? `<${arg.name}>` : `[${arg.name}]`,
      value: '',
      required: arg.required,
    });
  });

  (command.options ?? []).forEach((opt: TuiOption) => {
    const flagName = opt.flags.split(' ')[0]!.replace(/^--/, '');
    if (opt.type === 'boolean') {
      fields.push({
        id: `opt:${flagName}`,
        type: 'boolean-option',
        label: opt.flags,
        value: false,
        required: false,
        flagName: `--${flagName}`,
      });
    } else {
      fields.push({
        id: `opt:${flagName}`,
        type: 'string-option',
        label: opt.flags,
        value: '',
        required: false,
        flagName: opt.flags.split(' ')[0]!,
      });
    }
  });

  return fields;
}

function buildArgv(command: TuiCommand, fields: Field[]): string[] {
  const argv = [...command.baseArgv];
  const argFields = fields.filter((f) => f.type === 'arg');
  argFields.forEach((f) => {
    if (typeof f.value === 'string' && f.value.trim()) {
      argv.push(f.value.trim());
    }
  });
  const optFields = fields.filter((f) => f.type !== 'arg');
  optFields.forEach((f) => {
    if (f.type === 'boolean-option' && f.value === true) {
      argv.push(f.flagName!);
    } else if (f.type === 'string-option' && typeof f.value === 'string' && f.value.trim()) {
      argv.push(f.flagName!);
      argv.push(f.value.trim());
    }
  });
  return argv;
}

function hasRequiredMissing(fields: Field[]): boolean {
  return fields.some((f) => f.required && typeof f.value === 'string' && !f.value.trim());
}

export const CommandInspect: React.FC<CommandInspectProps> = ({ command, onRun, onBack }) => {
  const [fields, setFields] = useState<Field[]>(() => buildFields(command));
  const [focusIndex, setFocusIndex] = useState(0);

  const argv = buildArgv(command, fields);
  const canRun = !hasRequiredMissing(fields);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.tab) {
      setFocusIndex((i) => (key.shift ? (i > 0 ? i - 1 : fields.length - 1) : (i < fields.length - 1 ? i + 1 : 0)));
      return;
    }
    if (key.return && fields.length === 0) {
      onRun(argv);
      return;
    }
    if (key.return && focusIndex === fields.length) {
      if (canRun) onRun(argv);
      return;
    }
    const field = fields[focusIndex];
    if (!field) return;
    if (field.type === 'boolean-option' && input === ' ') {
      setFields((prev) => prev.map((f, i) => i === focusIndex ? { ...f, value: !f.value } : f));
      return;
    }
    if (field.type === 'boolean-option' && key.return) {
      setFocusIndex((f) => Math.min(f + 1, fields.length));
      return;
    }
  });

  const handleTextChange = (index: number, val: string) => {
    setFields((prev) => prev.map((f, i) => i === index ? { ...f, value: val } : f));
  };

  const previewStr = `$ bitcompass ${argv.join(' ')}`;

  if (command.inlineView === 'McpInline') {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Box marginBottom={1}>
          <Text bold color={theme.accent}>{command.label}</Text>
          <Text dimColor>  Esc to go back</Text>
        </Box>
        <McpInline />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      <Box marginBottom={1}>
        <Text bold color={theme.accent}>{command.label}</Text>
      </Box>
      <Text wrap="wrap" dimColor>{command.description}</Text>
      <Text> </Text>

      {fields.length === 0 ? (
        <Text dimColor>No arguments or options. Press Enter to run.</Text>
      ) : (
        <Box flexDirection="column" gap={0}>
          {fields.map((field, i) => {
            const isActive = i === focusIndex;
            if (field.type === 'boolean-option') {
              return (
                <Box key={field.id}>
                  <Text color={isActive ? theme.accent : undefined} bold={isActive}>
                    {isActive ? '❯ ' : '  '}
                    {field.value ? '☑' : '☐'}{' '}
                    <Text color="cyan">{field.label}</Text>
                    {isActive && <Text dimColor>  Space to toggle</Text>}
                  </Text>
                </Box>
              );
            }
            if (field.type === 'string-option') {
              return (
                <Box key={field.id}>
                  <Text color={isActive ? theme.accent : undefined} bold={isActive}>
                    {isActive ? '❯ ' : '  '}
                    <Text color="cyan">{field.label}</Text>{' '}
                  </Text>
                  {isActive ? (
                    <TextInput
                      value={typeof field.value === 'string' ? field.value : ''}
                      onChange={(val) => handleTextChange(i, val)}
                      onSubmit={() => setFocusIndex((f) => Math.min(f + 1, fields.length))}
                    />
                  ) : (
                    <Text dimColor>{typeof field.value === 'string' && field.value ? field.value : '(empty)'}</Text>
                  )}
                </Box>
              );
            }
            // arg
            return (
              <Box key={field.id}>
                <Text color={isActive ? theme.accent : 'yellow'} bold={isActive}>
                  {isActive ? '❯ ' : '  '}
                  {field.label}{' '}
                </Text>
                {isActive ? (
                  <TextInput
                    value={typeof field.value === 'string' ? field.value : ''}
                    onChange={(val) => handleTextChange(i, val)}
                    onSubmit={() => setFocusIndex((f) => Math.min(f + 1, fields.length))}
                  />
                ) : (
                  <Text dimColor>{typeof field.value === 'string' && field.value ? field.value : '(empty)'}</Text>
                )}
              </Box>
            );
          })}

          {/* Run button */}
          <Box marginTop={1}>
            <Text
              color={focusIndex === fields.length ? (canRun ? 'green' : 'red') : undefined}
              bold={focusIndex === fields.length}
            >
              {focusIndex === fields.length ? '❯ ' : '  '}
              {canRun ? '▶ Run' : '✗ Run (fill required fields first)'}
            </Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color={canRun ? theme.accent : 'gray'}>{previewStr}</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Tab/Shift-Tab cycle fields · Space toggle · Enter run/next · Esc back</Text>
      </Box>
    </Box>
  );
};
