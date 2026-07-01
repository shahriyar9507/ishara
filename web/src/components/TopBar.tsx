"use client";

import type { ReactNode } from "react";
import { BackIcon } from "./Icons";
import { CircleButton } from "./CircleButton";

/** Top bar: optional back button · centered title · optional trailing action. */
export function TopBar({
  title,
  badge,
  onBack,
  action,
}: {
  title?: ReactNode;
  badge?: ReactNode;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4">
      <div className="w-[52px]">
        {onBack && (
          <CircleButton label="Back" onClick={onBack}>
            <BackIcon width={22} height={22} />
          </CircleButton>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center">
        {badge}
        {title && <h1 className="text-base font-semibold text-primary">{title}</h1>}
      </div>

      <div className="flex w-[52px] justify-end">{action}</div>
    </header>
  );
}
