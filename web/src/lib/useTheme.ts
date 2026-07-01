"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "ishara-theme";

function systemDark(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && systemDark());
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

/** Theme preference + resolved dark/light. Persists to localStorage, follows system. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as ThemePref) || "system";
    setPref(saved);
    apply(saved);
    setResolved(document.documentElement.getAttribute("data-theme") as "light" | "dark");

    // React to system changes while on "system".
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem(KEY) as ThemePref) === "system") {
        apply("system");
        setResolved(document.documentElement.getAttribute("data-theme") as "light" | "dark");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: ThemePref) => {
    localStorage.setItem(KEY, next);
    setPref(next);
    apply(next);
    setResolved(document.documentElement.getAttribute("data-theme") as "light" | "dark");
  }, []);

  /** Cycle system → light → dark → system. */
  const cycle = useCallback(() => {
    setTheme(pref === "system" ? "light" : pref === "light" ? "dark" : "system");
  }, [pref, setTheme]);

  return { pref, resolved, setTheme, cycle };
}
