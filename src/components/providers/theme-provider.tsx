"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  accentCookie,
  applyAccentToDocument,
  parseAccent,
  parseTheme,
  serializeAccent,
  themeCookie,
  type AccentColor,
  type Theme,
} from "@/constants/theme";

const APPEARANCE_EVENT = "erp:appearance";

interface ThemeContextValue {
  readonly theme: Theme;
  readonly setTheme: (theme: Theme) => void;
  readonly toggleTheme: () => void;
  readonly accent: AccentColor;
  readonly setAccent: (accent: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function subscribe(onChange: () => void): () => void {
  window.addEventListener(APPEARANCE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(APPEARANCE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readDocumentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

let accentSnapshot = DEFAULT_ACCENT;
let accentSnapshotKey = serializeAccent(DEFAULT_ACCENT);

function readDocumentAccent(): AccentColor {
  const key = document.documentElement.dataset.accent ?? serializeAccent(DEFAULT_ACCENT);
  if (key === accentSnapshotKey) {
    return accentSnapshot;
  }
  accentSnapshotKey = key;
  accentSnapshot = parseAccent(key);
  return accentSnapshot;
}

function persist(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing can deny storage; the cookie still carries the preference.
  }
}

function notify(): void {
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.cookie = themeCookie(theme);
  persist(THEME_STORAGE_KEY, theme);
  notify();
}

function applyAccent(accent: AccentColor): void {
  applyAccentToDocument(accent, document.documentElement);
  document.cookie = accentCookie(accent);
  persist(ACCENT_STORAGE_KEY, serializeAccent(accent));
  accentSnapshotKey = serializeAccent(accent);
  accentSnapshot = accent;
  notify();
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: Theme;
  initialAccent?: AccentColor;
}

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
  initialAccent = DEFAULT_ACCENT,
}: ThemeProviderProps) {
  const theme = useSyncExternalStore(subscribe, readDocumentTheme, () => initialTheme);
  const accent = useSyncExternalStore(subscribe, readDocumentAccent, () => initialAccent);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(parseTheme(next));
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(readDocumentTheme() === "dark" ? "light" : "dark");
  }, []);

  const setAccent = useCallback((next: AccentColor) => {
    applyAccent(next);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, accent, setAccent }),
    [theme, setTheme, toggleTheme, accent, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}
