"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  size?: number;
};

/** Circular glass control button (speaker / clear / mode etc.). */
export function CircleButton({ children, label, size = 52, className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`glass flex items-center justify-center rounded-full text-primary/90 transition-transform active:scale-95 disabled:opacity-40 ${className}`}
      style={{ width: size, height: size, borderRadius: 999 }}
      {...rest}
    >
      {children}
    </button>
  );
}
