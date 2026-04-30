import { appConfig } from '@/shared/config/appConfig';
import type { ThemeMode } from '@/src/domain/models';

export const cookieNames = {
  theme: 'app_theme',
  pendingRole: 'app_pending_role',
} as const;

const validThemes = new Set(['light', 'dark', 'ocean', 'forest', 'ember']);

export const defaultTheme: ThemeMode = validThemes.has(appConfig.defaultTheme)
  ? (appConfig.defaultTheme as ThemeMode)
  : 'dark';



