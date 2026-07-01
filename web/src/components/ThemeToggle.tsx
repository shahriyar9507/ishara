"use client";

import { useTheme } from "@/lib/useTheme";
import { CircleButton } from "./CircleButton";
import { SunIcon, MoonIcon, AutoIcon } from "./Icons";

/** Cycles theme: system → light → dark. Icon reflects the current preference. */
export function ThemeToggle() {
  const { pref, cycle } = useTheme();
  const label =
    pref === "system" ? "Theme: follow system" : pref === "light" ? "Theme: light" : "Theme: dark";

  return (
    <CircleButton label={label} onClick={cycle}>
      {pref === "system" ? (
        <AutoIcon width={20} height={20} />
      ) : pref === "light" ? (
        <SunIcon width={20} height={20} />
      ) : (
        <MoonIcon width={20} height={20} />
      )}
    </CircleButton>
  );
}
