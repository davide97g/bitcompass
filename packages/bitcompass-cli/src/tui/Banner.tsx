import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { gradientChars } from './gradient.js';
import { theme } from './theme.js';

interface BannerProps {
  onComplete: () => void;
}

const TITLE = theme.name;
const SUBTITLE = theme.subtitle;
const INTERVAL_MS = 60;

export const Banner: React.FC<BannerProps> = ({ onComplete }) => {
  const [charCount, setCharCount] = useState(0);
  const [done, setDone] = useState(false);

  useInput(() => {
    if (!done) {
      setCharCount(TITLE.length);
      setDone(true);
      setTimeout(onComplete, 200);
    } else {
      onComplete();
    }
  });

  useEffect(() => {
    if (charCount >= TITLE.length) {
      setDone(true);
      const timeout = setTimeout(onComplete, 800);
      return () => clearTimeout(timeout);
    }
    const interval = setInterval(() => {
      setCharCount((n) => {
        const next = n + 1;
        if (next >= TITLE.length) clearInterval(interval);
        return next;
      });
    }, INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const visibleTitle = TITLE.slice(0, charCount);
  const chars = gradientChars(TITLE, theme.gradient[0], theme.gradient[1]);

  return (
    <Box flexDirection="column" alignItems="center" paddingTop={2} paddingBottom={2}>
      <Box>
        {chars.slice(0, charCount).map(({ char, color }, i) => (
          <Text key={i} color={color} bold>
            {char}
          </Text>
        ))}
        {charCount < TITLE.length && (
          <Text color={theme.accent}>▊</Text>
        )}
        {/* invisible spacer to reserve width */}
        <Text color="black">{TITLE.slice(visibleTitle.length)}</Text>
      </Box>

      {done && (
        <Box marginTop={1}>
          <Text dimColor>{SUBTITLE}</Text>
        </Box>
      )}

      <Box marginTop={2}>
        <Text dimColor>{done ? 'Press any key to continue…' : ''}</Text>
      </Box>
    </Box>
  );
};
