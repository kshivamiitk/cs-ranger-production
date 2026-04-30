'use client';

import { useEffect, useState, useTransition } from 'react';
import { Palette } from 'lucide-react';

import { apiJson } from '@/src/presentation/http/client';
import { messages } from '@/shared/config/messages';
import { Button } from '@/components/ui/Button';
import type { ThemeMode } from '@/src/domain/models';

const themeOptions: ThemeMode[] = ['light', 'dark', 'ocean', 'forest', 'ember'];
const themeCopy: Record<ThemeMode, { label: string; caption: string }> = {
  light: { label: 'Light', caption: 'Clean studio' },
  dark: { label: 'Dark', caption: 'Focus mode' },
  ocean: { label: 'Ocean', caption: 'Cool contrast' },
  forest: { label: 'Forest', caption: 'Muted depth' },
  ember: { label: 'Ember', caption: 'Claude-like warmth' },
};

export function ThemeSwitcher({ currentTheme, compact = false }: { currentTheme: ThemeMode; compact?: boolean }) {
  const [activeTheme, setActiveTheme] = useState(currentTheme);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setActiveTheme(currentTheme);
  }, [currentTheme]);

  function applyTheme(themeMode: ThemeMode) {
    setActiveTheme(themeMode);
    startTransition(async () => {
      document.documentElement.dataset.theme = themeMode;
      document.cookie = `app_theme=${themeMode}; path=/; SameSite=Lax`;
      try {
        await apiJson('/api/theme', {
          method: 'POST',
          body: JSON.stringify({ themeMode }),
        });
      } catch (error) {
        console.warn(messages.theme.saveWarning, error);
      }
    });
  }

  if (compact) {
    return (
      <label className="top-navbar-theme-select" aria-label="Switch theme">
        <Palette size={16} />
        <select value={activeTheme} disabled={pending} onChange={(event) => applyTheme(event.target.value as ThemeMode)}>
          {themeOptions.map((themeMode) => (
            <option key={themeMode} value={themeMode}>
              {themeCopy[themeMode].label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="stack sidebar-theme-selector">
      <div className="theme-switcher-grid">
        {themeOptions.map((themeMode) => (
          <Button
            key={themeMode}
            type="button"
            variant="ghost"
            className="theme-option-button"
            data-active={activeTheme === themeMode}
            disabled={pending}
            onClick={() => applyTheme(themeMode)}
          >
            <span className="theme-option-swatch" data-theme-preview={themeMode} />
            <span className="theme-option-copy">
              <span className="theme-option-label">{themeCopy[themeMode].label}</span>
              <span className="theme-option-caption">{themeCopy[themeMode].caption}</span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}


