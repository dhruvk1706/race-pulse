import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PanelProps {
  id?: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

export function Panel({ id, title, icon: Icon, children, action, subtitle, className = "" }: PanelProps) {
  return (
    <section id={id} aria-label={title} className={`panel ${className}`}>
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <Icon className="panel-icon" size={23} strokeWidth={2.3} aria-hidden="true" />
          <h2>{title}</h2>
          {subtitle}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
