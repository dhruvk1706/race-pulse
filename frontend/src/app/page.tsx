import { Dashboard } from "@/components/dashboard/dashboard";
import type { WeekendResponse } from "@/lib/f1/weekend";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialWeekend: WeekendResponse | null = null;
  try {
    const response = await fetch(`${process.env.BACKEND_URL ?? "http://127.0.0.1:4000"}/api/f1/weekend`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (response.ok) initialWeekend = await response.json();
  } catch (error) {
    // The client retries on mount; render the dashboard's own error state meanwhile.
    console.error("Backend unavailable", error);
  }
  return <Dashboard initialWeekend={initialWeekend} />;
}
