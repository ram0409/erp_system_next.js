"use client";

import { Link2Icon, PaletteIcon, PlusIcon } from "lucide-react";
import { useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ACCENT_PALETTES,
  ACCENT_SWATCHES_MAX,
  ACCENT_SWATCHES_STORAGE_KEY,
  matchingPaletteId,
  parseAccent,
  serializeAccent,
  type AccentColor,
} from "@/constants/theme";
import {
  COLOR_FORMATS,
  colorsEqual,
  formatColor,
  hslaToCss,
  parseColorInput,
  paletteShades,
  type ColorFormat,
} from "@/lib/color";
import { cn } from "@/lib/utils";

interface AccentColorPickerProps {
  readonly value: AccentColor;
  readonly onChange: (color: AccentColor) => void;
}

function hueTrack(): string {
  return "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)";
}

function saturationTrack(color: AccentColor): string {
  return `linear-gradient(to right, hsl(${String(color.h)} 0% ${String(color.l)}%), hsl(${String(color.h)} 100% ${String(color.l)}%))`;
}

function lightnessTrack(color: AccentColor): string {
  return `linear-gradient(to right, hsl(${String(color.h)} ${String(color.s)}% 0%), hsl(${String(color.h)} ${String(color.s)}% 50%), hsl(${String(color.h)} ${String(color.s)}% 100%))`;
}

function alphaTrack(color: AccentColor): string {
  const solid = `hsl(${String(color.h)} ${String(color.s)}% ${String(color.l)}%)`;
  return `linear-gradient(to right, transparent, ${solid}), repeating-conic-gradient(#c4c4c4 0% 25%, #f4f4f4 0% 50%) 0 0 / 0.7rem 0.7rem`;
}

function readSavedSwatches(): AccentColor[] {
  try {
    const raw = window.localStorage.getItem(ACCENT_SWATCHES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .slice(0, ACCENT_SWATCHES_MAX)
      .map((entry) => parseAccent(entry));
  } catch {
    return [];
  }
}

function writeSavedSwatches(swatches: readonly AccentColor[]): void {
  try {
    window.localStorage.setItem(
      ACCENT_SWATCHES_STORAGE_KEY,
      JSON.stringify(swatches.map(serializeAccent)),
    );
    window.dispatchEvent(new Event("erp:accent-swatches"));
  } catch {
    // Private browsing can deny storage.
  }
}

const EMPTY_SWATCHES: AccentColor[] = [];
let swatchSnapshot: AccentColor[] = EMPTY_SWATCHES;
let swatchSnapshotKey = "";

function getSwatchSnapshot(): AccentColor[] {
  const raw = window.localStorage.getItem(ACCENT_SWATCHES_STORAGE_KEY) ?? "";
  if (raw === swatchSnapshotKey) {
    return swatchSnapshot;
  }
  swatchSnapshotKey = raw;
  swatchSnapshot = readSavedSwatches();
  return swatchSnapshot;
}

function subscribeSwatches(onStoreChange: () => void): () => void {
  const onChange = () => {
    swatchSnapshotKey = "";
    onStoreChange();
  };
  window.addEventListener("storage", onChange);
  window.addEventListener("erp:accent-swatches", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("erp:accent-swatches", onChange);
  };
}

export function AccentColorPicker({ value, onChange }: AccentColorPickerProps) {
  const [format, setFormat] = useState<ColorFormat>("hex");
  const [draft, setDraft] = useState<string | null>(null);
  const [linked, setLinked] = useState(true);
  const saved = useSyncExternalStore(subscribeSwatches, getSwatchSnapshot, () => EMPTY_SWATCHES);

  const shades = useMemo(() => paletteShades(value), [value]);
  const paletteId = matchingPaletteId(value);
  const displayValue = draft ?? formatColor(value, format);

  function commit(next: AccentColor): void {
    onChange(next);
  }

  function commitDraft(): void {
    commit(parseColorInput(displayValue, value));
    setDraft(null);
  }

  function addSwatch(): void {
    if (saved.some((swatch) => colorsEqual(swatch, value))) {
      return;
    }
    writeSavedSwatches([value, ...saved].slice(0, ACCENT_SWATCHES_MAX));
  }

  function pickShade(shade: AccentColor): void {
    commit(linked ? { ...value, l: shade.l, a: shade.a } : shade);
  }

  const swatches = [...shades, ...saved.filter((swatch) => !shades.some((shade) => colorsEqual(shade, swatch)))].slice(
    0,
    8,
  );

  return (
    <div className="border-border bg-card w-full max-w-md rounded-xl border p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Input
          aria-label="Accent colour value"
          value={displayValue}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setDraft(formatColor(value, format))}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
            }
          }}
          className={cn(
            "h-9 font-mono text-xs tracking-wide",
            format === "hex" && "uppercase",
          )}
        />
        <Select
          value={format}
          onValueChange={(next) => {
            setDraft(null);
            setFormat(next as ColorFormat);
          }}
        >
          <SelectTrigger size="sm" className="h-9 w-[5.5rem] shrink-0" aria-label="Colour format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLOR_FORMATS.map((item) => (
              <SelectItem key={item} value={item}>
                {item.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              aria-label="Named palettes"
            >
              <PaletteIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Choose a named palette below</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={linked ? "secondary" : "ghost"}
              size="icon"
              className="size-9 shrink-0"
              aria-pressed={linked}
              aria-label={
                linked ? "Shades keep hue and saturation" : "Shades use their own colour"
              }
              onClick={() => setLinked((current) => !current)}
            >
              <Link2Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {linked ? "Shades keep this hue and saturation" : "Shades apply as full colours"}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-2.5">
        <SliderRow
          label="Hue"
          max={360}
          value={value.h}
          track={hueTrack()}
          onChange={(h) => commit({ ...value, h })}
        />
        <SliderRow
          label="Saturation"
          max={100}
          value={value.s}
          track={saturationTrack(value)}
          onChange={(s) => commit({ ...value, s })}
        />
        <SliderRow
          label="Lightness"
          max={100}
          value={value.l}
          track={lightnessTrack(value)}
          onChange={(l) => commit({ ...value, l })}
        />
        <SliderRow
          label="Opacity"
          max={100}
          value={value.a}
          track={alphaTrack(value)}
          onChange={(a) => commit({ ...value, a })}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select
          value={paletteId}
          onValueChange={(next) => {
            if (next === "custom") {
              return;
            }
            const palette = ACCENT_PALETTES.find((item) => item.id === next);
            if (palette) {
              commit(palette.color);
            }
          }}
        >
          <SelectTrigger size="sm" className="h-8 w-[7.5rem] shrink-0" aria-label="Accent palette">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCENT_PALETTES.map((palette) => (
              <SelectItem key={palette.id} value={palette.id}>
                {palette.label}
              </SelectItem>
            ))}
            {paletteId === "custom" ? <SelectItem value="custom">Custom</SelectItem> : null}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-center gap-1.5">
          {swatches.map((swatch, index) => {
            const selected = colorsEqual(swatch, value);
            return (
              <button
                key={`${serializeAccent(swatch)}-${String(index)}`}
                type="button"
                aria-label={`Use swatch ${String(index + 1)}`}
                aria-pressed={selected}
                onClick={() => pickShade(swatch)}
                className={cn(
                  "focus-visible:ring-ring size-7 rounded-md border transition outline-none focus-visible:ring-2",
                  selected ? "border-foreground ring-foreground/25 ring-2" : "border-border",
                )}
                style={{ backgroundColor: hslaToCss(swatch) }}
              />
            );
          })}
          <button
            type="button"
            onClick={addSwatch}
            aria-label="Save current colour to the palette"
            className="border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring flex size-7 items-center justify-center rounded-md border outline-none focus-visible:ring-2"
          >
            <PlusIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  max,
  track,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly track: string;
  readonly onChange: (value: number) => void;
}) {
  const id = `accent-${label.toLowerCase()}`;
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-range min-w-0 flex-1"
        style={{ ["--accent-range-track"]: track } as CSSProperties}
      />
      <span className="text-muted-foreground w-8 shrink-0 text-right font-mono text-xs tabular-nums">
        {value}
      </span>
    </div>
  );
}
