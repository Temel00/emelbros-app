"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { THEME_STORAGE_KEY } from "@/lib/theme";

const listeners = new Set<() => void>();

// Keeps the `.dark` class in sync with the OS preference for as long as no
// explicit override is stored, and notifies subscribers on either kind of
// change — the useSyncExternalStore-recommended way to bridge an external
// event source into React without setState-in-effect (#18).
function subscribe(callback: () => void) {
  listeners.add(callback);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMediaChange = () => {
    if (!localStorage.getItem(THEME_STORAGE_KEY)) {
      document.documentElement.classList.toggle("dark", media.matches);
      callback();
    }
  };
  media.addEventListener("change", onMediaChange);

  return () => {
    listeners.delete(callback);
    media.removeEventListener("change", onMediaChange);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

function setTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  listeners.forEach((listener) => listener());
}

/**
 * Manual light/dark override on top of `prefers-color-scheme` (#18). Wins in
 * both directions once set; layout.tsx applies the resolved theme before
 * first paint to avoid a flash. Renders a disabled placeholder until
 * mounted, since the server can't know the client's class.
 */
export function ThemeToggle() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!mounted) {
    return <Button variant="outline" size="icon" aria-hidden disabled />;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(!isDark)}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
