import type { SettingsPartsFragment } from "../../tina/__generated__/types";

function hexToRgb(hex: string): string | null {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length === 8) h = h.slice(0, 6);
  const m = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : null;
}

const BRAND_VARS = [
  "primary", "primaryDark", "primaryLight",
  "accent", "accentLight", "accentHover",
  "gold", "goldLight", "goldHover",
  "green", "greenLight",
  "footerBg", "heroBgStart", "bodyBg",
] as const;

export default function ThemeStyle({ settings }: { settings: SettingsPartsFragment }) {
  const colors = settings.brand?.colors;
  if (!colors) return null;

  const cssVars = BRAND_VARS.map((key) => {
    const value = colors[key as (typeof BRAND_VARS)[number]];
    if (!value) return "";
    const cssName = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    const rgb = hexToRgb(value);
    return `  ${cssName}: ${value};${rgb ? `\n  ${cssName}-rgb: ${rgb};` : ""}`;
  }).filter(Boolean).join("\n");

  if (!cssVars) return null;

  return <style>{`:root {\n${cssVars}\n}`}</style>;
}
