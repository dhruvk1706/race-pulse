"use client";
import { ArrowRight, FileText } from "lucide-react";
import { useState } from "react";
import type { NewsStory } from "@/lib/f1/dashboard";
import { formatSessionTimestamp } from "@/lib/f1/weekend";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/panel";

export function LatestNews({ news, loading }: { news: NewsStory[]; loading: boolean }) {
  const [allNews, setAllNews] = useState(false);
  const stories = (items: NewsStory[]) => items.map((story) => <a className="real-news-story" href={story.url} target="_blank" rel="noopener noreferrer" key={story.url}><span className="news-title">{story.title}</span><span className="news-age">BBC Sport · {formatSessionTimestamp(story.publishedAt)}</span><ArrowRight size={16} aria-hidden="true" /></a>);
  return <><Panel id="latest-news" title="LATEST NEWS" icon={FileText} className="latest-news-panel" action={<button className="text-action" disabled={!news.length} onClick={() => setAllNews(true)}>View All News <ArrowRight size={16} /></button>}><div className="news-list">{news.length ? stories(news.slice(0, 3)) : <p className="data-empty">{loading ? "Loading BBC Sport headlines…" : "News feed unavailable. Try refreshing."}</p>}</div></Panel><Modal title="Latest F1 News · BBC Sport" open={allNews} onClose={() => setAllNews(false)}><div className="news-dialog-list">{stories(news)}</div></Modal></>;
}
