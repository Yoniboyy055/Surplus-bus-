import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type ErrorEvent = {
  timestamp: string;
  route: string;
  message: string;
  context?: Record<string, unknown>;
};

function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[redacted-uuid]");
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

export function captureError(route: string, error: unknown, context?: Record<string, unknown>) {
  const event: ErrorEvent = {
    timestamp: new Date().toISOString(),
    route,
    message: sanitize(error instanceof Error ? error.message : String(error)) as string,
    context: sanitize(context) as Record<string, unknown> | undefined,
  };

  try {
    mkdirSync("audit_artifacts", { recursive: true });
    appendFileSync(join("audit_artifacts", "error-events.log"), `${JSON.stringify(event)}\n`, "utf8");
  } catch {
    // Intentionally swallow to avoid cascading failures.
  }
}
