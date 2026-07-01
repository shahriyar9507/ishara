"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "./Icons";

export interface Option {
  id: string;
  label: string;
  sublabel?: string;
  leading?: ReactNode; // icon / flag / emoji
}

/** Rounded list of selectable rows (matches the "Change Language" reference). */
export function OptionList({
  options,
  selectedId,
  onSelect,
}: {
  options: Option[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {options.map((o) => {
        const selected = o.id === selectedId;
        return (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => onSelect(o.id)}
              aria-pressed={selected}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                selected ? "accent-gradient text-white shadow-lg" : "glass text-primary"
              }`}
            >
              {o.leading && <span className="text-xl">{o.leading}</span>}
              <span className="flex-1">
                <span className="bangla block font-medium">{o.label}</span>
                {o.sublabel && (
                  <span className={`block text-xs ${selected ? "text-white/80" : "text-secondary"}`}>
                    {o.sublabel}
                  </span>
                )}
              </span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                  selected ? "border-white bg-white/20" : "border-glassborder"
                }`}
              >
                {selected && <CheckIcon width={16} height={16} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
