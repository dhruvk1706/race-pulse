"use client";

import { Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import type { DashboardResponse } from "@/lib/f1/dashboard";
import type { WeekendMeeting } from "@/lib/f1/weekend";

export function Topbar({ onMenuClick, navigationOpen, meeting, data }: { onMenuClick: () => void; navigationOpen: boolean; meeting: WeekendMeeting | null; data: DashboardResponse | null }) {
  const timing = data?.snapshot?.timing ?? [];
  const news = data?.news ?? [];
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const term = query.trim().toLowerCase();
  const results = term ? [
    ...timing.filter((entry) => `${entry.driver} ${entry.fullName} ${entry.team}`.toLowerCase().includes(term)).map((entry) => ({ label: entry.fullName, detail: entry.team, target: "live-timing" })),
    ...(data?.drivers ?? []).filter((entry) => entry.name.toLowerCase().includes(term)).map((entry) => ({ label: entry.name, detail: "Championship standings", target: "championship" })),
    ...news.filter((story) => story.title.toLowerCase().includes(term)).map((story) => ({ label: story.title, detail: "BBC Sport", target: "latest-news" })),
    ...(meeting && `${meeting.name} ${meeting.circuit} ${meeting.location} ${meeting.country}`.toLowerCase().includes(term) ? [{ label: meeting.name, detail: meeting.circuit, target: "race-weekend" }] : []),
  ].slice(0, 7) : [];

  return (
    <header className="topbar" inert={navigationOpen}>
      <button className="mobile-menu icon-button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" onClick={onMenuClick}><Menu size={23} /></button>
      <div className="search-container" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false); }}>
        <div className="search-field">
          <Search size={20} strokeWidth={1.7} aria-hidden="true" />
          <input aria-label="Search drivers, teams, circuits, and news" placeholder="Search drivers, teams, circuits, news..." value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} />
          {query && <button className="search-clear" aria-label="Clear search" onClick={() => setQuery("")}><X size={16} /></button>}
        </div>
        {searchOpen && term && <div className="search-results" aria-label="Search results">
          {results.length ? results.map((result) => <a key={`${result.label}-${result.detail}`} href={`#${result.target}`} onClick={() => { setSearchOpen(false); setQuery(""); }}><span>{result.label}</span><small>{result.detail}</small></a>) : <p>No results for “{query}”</p>}
        </div>}
      </div>
      <div className="topbar-account">
        <a className="notification-button icon-button" href="#strategy-alerts" aria-label="View race-control messages"><Bell size={22} strokeWidth={1.7} /></a>
        <span className="topbar-divider" />
        <div className="profile" aria-label="Race Pulse"><span className="avatar">RP</span><span className="profile-name">Race Pulse</span><ChevronDown size={17} aria-hidden="true" /></div>
      </div>
    </header>
  );
}
