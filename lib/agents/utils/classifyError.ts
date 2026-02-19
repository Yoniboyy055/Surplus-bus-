/**
 * Classifies errors for source_run_failures logging.
 */
export type ErrorClass = "network_error" | "parser_error" | "schema_error" | "unknown_error";

export function classifyError(err: unknown): { error_class: ErrorClass; error_message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("socket") ||
    lower.includes("timeout")
  ) {
    return { error_class: "network_error", error_message: msg };
  }

  if (
    lower.includes("parse") ||
    lower.includes("parser") ||
    lower.includes("unknown parser") ||
    lower.includes("http 4") ||
    lower.includes("http 5")
  ) {
    return { error_class: "parser_error", error_message: msg };
  }

  if (
    lower.includes("schema") ||
    lower.includes("column") ||
    lower.includes("constraint") ||
    lower.includes("foreign key") ||
    lower.includes("unique") ||
    lower.includes("violates")
  ) {
    return { error_class: "schema_error", error_message: msg };
  }

  return { error_class: "unknown_error", error_message: msg };
}
