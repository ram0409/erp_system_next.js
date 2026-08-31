"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { useTheme } from "@/components/providers/theme-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccentColorPicker } from "@/features/settings/components/accent-color-picker";
import type { Theme } from "@/constants/theme";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: readonly { value: Theme; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Bright canvas for daytime use" },
  { value: "dark", label: "Dark", hint: "Dim canvas for low light" },
];

export function AppearanceSettings() {
  const { theme, setTheme, accent, setAccent } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Screen theme and accent colour. The picker sets hue, saturation, lightness
          and opacity; light and dark mix those values automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-foreground text-sm font-medium">Theme</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {THEME_OPTIONS.map((option) => {
              const selected = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={selected}
                  className={cn(
                    "focus-visible:ring-ring flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition outline-none focus-visible:ring-2",
                    selected
                      ? "border-primary bg-primary/8 ring-primary/20 ring-1"
                      : "border-border bg-surface hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {option.value === "dark" ? (
                      <MoonIcon className="size-4" />
                    ) : (
                      <SunIcon className="size-4" />
                    )}
                  </span>
                  <span>
                    <span className="text-foreground block text-sm font-medium">{option.label}</span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-foreground text-sm font-medium">Accent colour</legend>
          <AccentColorPicker value={accent} onChange={setAccent} />
        </fieldset>
      </CardContent>
    </Card>
  );
}
