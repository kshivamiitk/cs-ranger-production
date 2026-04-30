export type RequestTiming = {
  requestId: string;
  route: string;
  method: string;
  startedAt: number;
  dbMs?: number;
  cacheMs?: number;
  queueMs?: number;
  totalMs?: number;
};

export function finishTiming(timing: RequestTiming): RequestTiming {
  return { ...timing, totalMs: Date.now() - timing.startedAt };
}



