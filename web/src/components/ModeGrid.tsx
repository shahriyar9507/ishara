"use client";

import type { ReactNode } from "react";

export interface ModeCard {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  pro?: boolean; // shows a crown badge (upgrade/premium) like the reference
  disabled?: boolean;
}

/** 2-column card grid (matches the "Select Model & Tool" reference). */
export function ModeGrid({
  cards,
  selectedId,
  onSelect,
}: {
  cards: ModeCard[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => {
        const selected = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            disabled={c.disabled}
            onClick={() => onSelect(c.id)}
            aria-pressed={selected}
            className={`glass relative flex flex-col gap-2 p-4 text-left transition disabled:opacity-45 ${
              selected ? "ring-2 ring-accent" : ""
            }`}
          >
            {c.pro && (
              <span className="absolute right-3 top-3 text-amber-400" title="Premium">
                ♛
              </span>
            )}
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                selected ? "accent-gradient text-white" : "bg-black/20 text-primary"
              }`}
            >
              {c.icon}
            </span>
            <span className="bangla text-base font-semibold text-primary">{c.title}</span>
            <span className="text-xs leading-snug text-secondary">{c.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
