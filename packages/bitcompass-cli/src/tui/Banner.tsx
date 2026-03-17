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
  const [completed, setCompleted] = useState(false);

  // Skip animation on any keypress
  useInput(() => {
    if (!completed) {
      setCompleted(true);
      setCharCount(TITLE.length);
      setDone(true);
      onComplete();
    }
  });

  // Typewriter interval
  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setCharCount((n) => {
        const next = n + 1;
        if (next >= TITLE.length) {
          clearInterval(interval);
          setDone(true);
        }
        return next;
      });
    }, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [done]);

  // Auto-advance after animation finishes
  useEffect(() => {
    if (!done || completed) return;
    setCompleted(true);
    const t = setTimeout(onComplete, 600);
    return () => clearTimeout(t);
  }, [done]);

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
          <Text color={theme.accent}>|</Text>
        )}
      </Box>

      {done && (
        <Box marginTop={1}>
          <Text dimColor>{SUBTITLE}</Text>
        </Box>
      )}

      <Box marginTop={2}>
        <Text dimColor>{done ? 'Press any key to continue...' : ' '}</Text>
      </Box>
    </Box>
  );
};
