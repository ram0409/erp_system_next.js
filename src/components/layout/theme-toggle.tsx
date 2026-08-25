"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  /** Use on the sign-in canvas where the control sits on a dark gradient. */
  onBrand?: boolean;
}

export function ThemeToggle({ className, onBrand = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={label}
          aria-pressed={isDark}
          className={cn(
            onBrand && "text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/70",
            className,
          )}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
