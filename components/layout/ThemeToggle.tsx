"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { IconButton } from "@/components/ui/IconButton";

/**
 * ThemeToggle — flips between light and dark. Reflects the currently resolved
 * theme; when the preference is "system" it toggles to the opposite of what is
 * showing. Hidden from SSR mismatch by rendering the icon from resolved state
 * (which is corrected on mount by ThemeProvider).
 */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === "dark";
  return (
    <IconButton
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
      onClick={toggle}
    />
  );
}
