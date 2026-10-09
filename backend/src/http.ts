const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// OpenF1's free tier allows ~3 requests a second, so space request starts out.
const OPENF1_GAP_MS = 350;
let gate: Promise<void> = Promise.resolve();
function openF1Turn(): Promise<void> {
  const turn = gate;
  gate = gate.then(() => sleep(OPENF1_GAP_MS));
  return turn;
}

export async function fetchOk(url: string, timeoutMs = 15_000): Promise<Response> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`${new URL(url).host} returned HTTP ${response.status}`);
  return response;
}

export async function fetchOpenF1(resource: string): Promise<unknown> {
  const url = `https://api.openf1.org/v1/${resource}`;
  for (let attempt = 0; ; attempt++) {
    await openF1Turn();
    try {
      return await (await fetchOk(url, 10_000)).json();
    } catch (error) {
      // Retry rate limits only; everything else fails fast.
      if (attempt >= 3 || !(error instanceof Error) || !error.message.endsWith("HTTP 429")) throw error;
      await sleep((attempt + 1) * 1000);
    }
  }
}
