"use client";

import { ArrowRight, FileText } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { news, type NewsStory } from "@/data/dashboard";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/panel";

export function LatestNews() {
  const [selectedStory, setSelectedStory] = useState<NewsStory | null>(null);
  const [allNews, setAllNews] = useState(false);

  return <><Panel id="latest-news" title="LATEST NEWS" icon={FileText} className="latest-news-panel" action={<button className="text-action" onClick={() => setAllNews(true)}>View All News <ArrowRight size={16} /></button>}><div className="news-list">{news.map((story) => <button className="news-story" key={story.id} onClick={() => setSelectedStory(story)}><span className="news-image"><Image src={story.image} alt={story.id === "tyre-strategy" ? "Slick racing tyres in the pit lane" : "Unbranded open-wheel race car on the circuit"} fill sizes="156px" style={{ objectPosition: story.imagePosition }} /></span><span className="news-copy"><span className="news-title">{story.title}</span><span className="news-age">{story.age}</span></span>{story.live && <Badge>LIVE</Badge>}</button>)}</div></Panel><Modal title={selectedStory?.title ?? "Latest News"} open={!!selectedStory} onClose={() => setSelectedStory(null)}>{selectedStory && <><div className="article-image"><Image src={selectedStory.image} alt="Motorsport news photography" fill sizes="(max-width: 700px) 90vw, 700px" /></div><p className="detail-meta">SUZUKA · {selectedStory.age}</p><p className="article-body">{selectedStory.body}</p></>}</Modal><Modal title="Latest News · Suzuka" open={allNews} onClose={() => setAllNews(false)}><div className="news-dialog-list">{news.map((story) => <button key={story.id} onClick={() => { setAllNews(false); setSelectedStory(story); }}><h3>{story.title}</h3><span>{story.age}</span><ArrowRight size={18} /></button>)}</div></Modal></>;
}
