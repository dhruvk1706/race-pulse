"use client";

import { Activity, CalendarDays, ChartNoAxesColumnIncreasing, CircleUserRound, House, Newspaper, Settings, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const navigation = [
  { label: "Dashboard", icon: House, target: "dashboard" },
  { label: "Live Race", icon: Activity, target: "live-timing" },
  { label: "Strategy Center", icon: ChartNoAxesColumnIncreasing, target: "strategy-alerts" },
  { label: "News", icon: Newspaper, target: "latest-news" },
  { label: "Drivers", icon: CircleUserRound, target: "championship" },
  { label: "Teams", icon: UsersRound, target: "championship" },
  { label: "Calendar", icon: CalendarDays, target: "upcoming-sessions" },
] as const;

export function Sidebar({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (section: string, label: string) => void }) {
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (open && !isMobile) onClose();
  }, [isMobile, open, onClose]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const menuButton = document.querySelector<HTMLButtonElement>(".mobile-menu");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const getFocusable = () => Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []).filter((element) => element.offsetParent !== null);
    getFocusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const elements = getFocusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      menuButton?.focus();
    };
  }, [isMobile, open, onClose]);

  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} tabIndex={-1} />}
      <aside ref={sidebarRef} id="main-navigation" className={`sidebar ${open ? "is-open" : ""}`} role={isMobile ? "dialog" : undefined} aria-label="Main navigation" aria-modal={isMobile && open ? true : undefined} aria-hidden={isMobile && !open ? true : undefined} inert={isMobile && !open}>
        <a href="#dashboard" className="brand" onClick={onClose} aria-label="Race Pulse dashboard">
          <span className="wordmark">RACE <span>PULSE</span></span>
          <span className="brand-caption">NEWS <i>\</i> DATA <i>\</i> STRATEGY</span>
        </a>
        <button className="mobile-sidebar-close icon-button" aria-label="Close navigation" onClick={onClose}><X size={22} /></button>
        <nav>
          {navigation.map(({ label, icon: Icon, target }, index) => (
            <a key={label} href={`#${target}`} aria-label={label} className={`nav-item ${index === 0 ? "active" : ""}`} aria-current={index === 0 ? "page" : undefined} onClick={() => { onNavigate(target, label); onClose(); }}>
              <Icon size={24} strokeWidth={1.9} fill={index === 0 ? "currentColor" : "none"} aria-hidden="true" /><span>{label}</span>
            </a>
          ))}
          <button className="nav-item settings-item" disabled title="Settings will be available in a future update"><Settings size={24} strokeWidth={2.2} aria-hidden="true" /><span>Settings</span></button>
        </nav>
        
        <p className="sidebar-tagline">FASTER<br />INSIGHTS.<br />BRIGHTER<br />RACES.</p>
      </aside>
    </>
  );
}
