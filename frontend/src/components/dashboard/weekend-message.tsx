import type { WeekendState } from "./use-weekend";

export function WeekendMessage({ weekend }: { weekend: WeekendState }) {
  const message = weekend.loading ? "Loading race weekend…" : weekend.error ?? "Session times are not available for this race yet.";
  return <div className="weekend-message" role={weekend.error ? "alert" : "status"}><p className="detail-meta">{message}</p>{weekend.error && !weekend.loading && <button className="text-action" onClick={weekend.retry}>Try again</button>}</div>;
}
