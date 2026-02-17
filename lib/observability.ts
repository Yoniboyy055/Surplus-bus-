/**
 * Structured logging for API routes.
 * Logs: route, requestId, userId, params, durationMs
 */
const genId = () => Math.random().toString(36).slice(2, 11);

export function logApiStart(route: string, userId: string | null, params?: Record<string, unknown>) {
  const requestId = genId();
  console.info(
    JSON.stringify({
      event: "api_start",
      route,
      requestId,
      userId: userId ?? null,
      params: params ?? {},
    })
  );
  return { requestId, start: Date.now() };
}

export function logApiEnd(route: string, requestId: string, start: number, status?: number) {
  const durationMs = Date.now() - start;
  console.info(
    JSON.stringify({
      event: "api_end",
      route,
      requestId,
      durationMs,
      status: status ?? null,
    })
  );
}
