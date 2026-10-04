import type { ReactNode } from "react";

export function Badge({ children, variant = "live", className = "" }: { children: ReactNode; variant?: "live" | "complete"; className?: string }) {
  return <span className={`status-badge ${variant} ${className}`}>{variant === "live" && <span className="status-dot" aria-hidden="true" />}{children}</span>;
}
