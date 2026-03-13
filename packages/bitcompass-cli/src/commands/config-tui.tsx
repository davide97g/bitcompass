import React, { useState, useEffect } from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import { fetchCompassProjectsForCurrentUser, getCompassProjectById } from '../api/client.js';
import { isLoggedIn } from '../auth/config.js';
import { loadProjectConfig, saveProjectConfig } from '../auth/project-config.js';
import type { CompassProject, DefaultSharing, ProjectConfig } from '../types.js';

// Read version from package.json (dist/commands/ → ../../package.json)
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', '..', 'package.json');
const cliVersion = JSON.parse(readFileSync(packageJsonPath, 'utf-8')).version as string;

interface SettingItem {
  key: string;
  label: string;
  type: 'select' | 'toggle' | 'readonly';
}

const SETTINGS: SettingItem[] = [
  { key: 'projectLink', label: 'Project Link', type: 'select' },
  { key: 'defaultSharing', label: 'Default Sharing', type: 'toggle' },
  { key: 'version', label: 'Version', type: 'readonly' },
];

interface ProjectSelectProps {
  projects: CompassProject[];
  currentProjectId: string | null;
  onSelect: (id: string | null) => void;
  onBack: () => void;
}

const ProjectSelect: React.FC<ProjectSelectProps> = ({ projects, currentProjectId, onSelect, onBack }) => {
  const choices = [
    { id: null as string | null, label: 'None (personal only)' },
    ...projects.map((p) => ({
      id: p.id as string | null,
      label: p.description ? `${p.title} – ${p.description}` : p.title,
    })),
  ];

  if (currentProjectId) {
    choices.push({ id: '__remove__', label: 'Remove current project' });
  }

  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = choices.findIndex((c) => c.id === currentProjectId);
    return idx >= 0 ? idx : 0;
  });

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : choices.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => (i < choices.length - 1 ? i + 1 : 0));
      return;
    }
    if (key.return) {
      const choice = choices[selectedIndex]!;
      if (choice.id === '__remove__') {
        onSelect(null);
      } else {
        onSelect(choice.id);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Select a Compass Project</Text>
      <Text dimColor>Use ↑↓ to navigate, Enter to select, Esc to go back</Text>
      <Text> </Text>
      {choices.map((choice, i) => {
        const isSelected = i === selectedIndex;
        const isCurrent = choice.id === currentProjectId;
        const prefix = isSelected ? '❯ ' : '  ';
        return (
          <Text key={`project-${i}`}>
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {prefix}{choice.label}
            </Text>
            {isCurrent && <Text dimColor> (current)</Text>}
          </Text>
        );
      })}
    </Box>
  );
};

const ConfigApp: React.FC = () => {
  const { exit } = useApp();
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState<'main' | 'project-select'>('main');
  const [projects, setProjects] = useState<CompassProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);

  // Load config on mount
  useEffect(() => {
    const loaded = loadProjectConfig();
    const cfg = loaded ?? {
      editor: 'cursor' as const,
      outputPath: '.cursor/rules',
      compassProjectId: null,
      defaultSharing: 'private' as const,
    };
    if (!cfg.defaultSharing) cfg.defaultSharing = 'private';
    setConfig(cfg);

    // Resolve project name if a project is linked
    if (cfg.compassProjectId) {
      getCompassProjectById(cfg.compassProjectId).then((p) => {
        if (p) setProjectName(p.title);
      }).catch(() => {});
    }
  }, []);

  const saveAndUpdate = (newConfig: ProjectConfig) => {
    setConfig(newConfig);
    saveProjectConfig(newConfig);
  };

  const getValueDisplay = (setting: SettingItem): string => {
    if (!config) return '…';
    switch (setting.key) {
      case 'projectLink':
        if (config.compassProjectId) {
          return projectName ?? config.compassProjectId;
        }
        return 'None';
      case 'defaultSharing':
        return config.defaultSharing ?? 'private';
      case 'version':
        return cliVersion;
      default:
        return '';
    }
  };

  const handleMainInput = (input: string, key: { upArrow: boolean; downArrow: boolean; return: boolean; leftArrow: boolean; rightArrow: boolean; escape: boolean }) => {
    if (key.escape || input === 'q') {
      exit();
      return;
    }

    // Navigate settings
    const selectableCount = SETTINGS.filter((s) => s.type !== 'readonly').length;
    if (key.upArrow) {
      setSelectedIndex((i) => {
        let next = i > 0 ? i - 1 : SETTINGS.length - 1;
        // Skip readonly items when navigating up
        while (SETTINGS[next]?.type === 'readonly' && next > 0) next--;
        if (SETTINGS[next]?.type === 'readonly') next = SETTINGS.length - 2;
        return next;
      });
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => {
        let next = i < SETTINGS.length - 1 ? i + 1 : 0;
        // Skip readonly items when navigating down
        while (SETTINGS[next]?.type === 'readonly' && next < SETTINGS.length - 1) next++;
        if (SETTINGS[next]?.type === 'readonly') next = 0;
        return next;
      });
      return;
    }

    if (!config) return;
    const current = SETTINGS[selectedIndex]!;

    // Toggle for defaultSharing
    if (current.key === 'defaultSharing' && (key.return || key.leftArrow || key.rightArrow)) {
      const newValue: DefaultSharing = config.defaultSharing === 'private' ? 'public' : 'private';
      saveAndUpdate({ ...config, defaultSharing: newValue });
      return;
    }

    // Select for projectLink
    if (current.key === 'projectLink' && key.return) {
      if (!isLoggedIn()) {
        // Can't fetch projects without login
        return;
      }
      setLoadingProjects(true);
      fetchCompassProjectsForCurrentUser().then((p) => {
        setProjects(p);
        setLoadingProjects(false);
        setView('project-select');
      }).catch(() => {
        setLoadingProjects(false);
      });
      return;
    }
  };

  useInput((input, key) => {
    if (view === 'main') {
      handleMainInput(input, key);
    }
  }, { isActive: view === 'main' });

  const handleProjectSelect = (id: string | null) => {
    if (!config) return;
    const newConfig = { ...config, compassProjectId: id };
    saveAndUpdate(newConfig);

    if (id) {
      const project = projects.find((p) => p.id === id);
      setProjectName(project?.title ?? null);
    } else {
      setProjectName(null);
    }

    setView('main');
  };

  if (!config) {
    return <Text dimColor>Loading configuration…</Text>;
  }

  if (view === 'project-select') {
    return (
      <ProjectSelect
        projects={projects}
        currentProjectId={config.compassProjectId ?? null}
        onSelect={handleProjectSelect}
        onBack={() => setView('main')}
      />
    );
  }

  if (loadingProjects) {
    return <Text dimColor>Loading projects…</Text>;
  }

  const maxLabelLen = Math.max(...SETTINGS.map((s) => s.label.length));

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">BitCompass Configuration</Text>
      </Box>

      <Text dimColor>Configure BitCompass preferences</Text>
      <Text> </Text>

      {SETTINGS.map((setting, i) => {
        const isSelected = i === selectedIndex;
        const isReadonly = setting.type === 'readonly';
        const value = getValueDisplay(setting);
        const prefix = isReadonly ? '  ' : isSelected ? '❯ ' : '  ';
        const padding = ' '.repeat(maxLabelLen - setting.label.length + 4);

        return (
          <Text key={setting.key}>
            <Text color={isSelected && !isReadonly ? 'cyan' : undefined} bold={isSelected && !isReadonly}>
              {prefix}{setting.label}
            </Text>
            <Text dimColor={isReadonly} color={!isReadonly && isSelected ? 'green' : undefined}>
              {padding}{value}
            </Text>
            {setting.type === 'toggle' && isSelected && (
              <Text dimColor>  ← → to toggle</Text>
            )}
            {setting.key === 'projectLink' && isSelected && !isLoggedIn() && (
              <Text color="yellow">  (login required)</Text>
            )}
          </Text>
        );
      })}

      <Text> </Text>
      <Text dimColor>↑↓ navigate · Enter/←→ change · q/Esc exit</Text>
    </Box>
  );
};

export const runConfigTui = async (): Promise<void> => {
  if (!process.stdin.isTTY) {
    // Fall back to non-interactive config list
    const { runConfigList } = await import('./config-cmd.js');
    runConfigList();
    return;
  }
  const { waitUntilExit } = render(<ConfigApp />);
  await waitUntilExit();
};
