/**
 * CSV helpers for listing exports. Formula-looking cells are quoted with a
 * leading apostrophe so a spreadsheet does not treat them as formulas.
 */

function escapeCsvCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replaceAll('"', '""')}"`;
  }

  return guarded;
}

export function toCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return escapeCsvCell(value);
}

export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | boolean | null | undefined)[])[],
): string {
  const lines = [
    headers.map((header) => escapeCsvCell(header)).join(","),
    ...rows.map((row) => row.map((cell) => toCsvCell(cell)).join(",")),
  ];

  // BOM so Excel on Windows recognises UTF-8 rather than a local code page.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
