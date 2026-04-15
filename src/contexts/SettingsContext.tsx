import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface AppSettings {
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  responseLength: 'concise' | 'standard' | 'detailed';
  language: 'es' | 'en';
  autoSaveHistory: boolean;
  animationsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#00deff',
  fontSize: 'medium',
  responseLength: 'standard',
  language: 'es',
  autoSaveHistory: true,
  animationsEnabled: true,
};

const SETTINGS_KEY = 'rema_settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettingsToStorage(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Map accent colors to their rgba-friendly versions
const ACCENT_RGBA: Record<string, string> = {
  '#00deff': '0, 222, 255',
  '#ed1576': '237, 21, 118',
  '#9048e5': '144, 72, 229',
  '#3661f4': '54, 97, 244',
  '#37c871': '55, 200, 113',
  '#f28b24': '242, 139, 36',
  '#f6c836': '246, 200, 54',
  '#f44e3b': '244, 78, 59',
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  // Apply side effects whenever settings change
  useEffect(() => {
    saveSettingsToStorage(settings);
    const root = document.documentElement;

    // === THEME ===
    let resolvedTheme = settings.theme;
    if (resolvedTheme === 'auto') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    root.setAttribute('data-theme', resolvedTheme);

    // === ACCENT COLOR ===
    root.style.setProperty('--neon-cyan', settings.accentColor);
    const rgba = ACCENT_RGBA[settings.accentColor] || '0, 222, 255';
    root.style.setProperty('--accent-rgb', rgba);

    // === FONT SIZE ===
    const fontSizeMap = { small: '14px', medium: '16px', large: '18px' };
    root.style.setProperty('--content-font-size', fontSizeMap[settings.fontSize]);

    // === ANIMATIONS ===
    if (!settings.animationsEnabled) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }
  }, [settings]);

  // Listen for system theme change when 'auto' is selected
  useEffect(() => {
    if (settings.theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'light' : 'dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
