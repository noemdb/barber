"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="h-9 w-9 grid place-items-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-200"
      aria-label={theme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
      aria-pressed={theme === "dark"}
    >
      <span className="relative grid place-items-center">
        <Sun
          className="h-5 w-5 text-yellow-400 transition-all duration-200"
          style={{ opacity: theme === "light" ? 1 : 0, transform: `scale(${theme === "light" ? 1 : 0})` }}
          aria-hidden={theme !== "light"}
        />
        <Moon
          className="h-5 w-5 text-blue-400 absolute transition-all duration-200"
          style={{ opacity: theme === "dark" ? 1 : 0, transform: `scale(${theme === "dark" ? 1 : 0})` }}
          aria-hidden={theme !== "dark"}
        />
      </span>
    </button>
  );
}