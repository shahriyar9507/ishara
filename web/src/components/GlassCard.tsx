import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & { as?: "div" | "section" };

/** Frosted glass surface — the base for cards, panels and bars. */
export function GlassCard({ className = "", children, ...rest }: Props) {
  return (
    <div className={`glass ${className}`} {...rest}>
      {children}
    </div>
  );
}
