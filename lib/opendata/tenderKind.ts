/**
 * CanadaBuys notice types. Not every "open" notice is a bid opportunity:
 * Requests for Information gather market input and Advance Contract Award
 * Notices announce an intended award to a named supplier (YkData check of the
 * Nov 9, 2026 file: 73 RFIs and 17 ACANs among 924 open notices).
 */
export type NoticeKind = "bid" | "rfi" | "acan" | "unspecified";

export function classifyNotice(noticeType: string | null | undefined): { kind: NoticeKind; label: string; note: string | null } {
  const t = (noticeType || "").trim();
  if (!t) return { kind: "unspecified", label: "Notice type not given", note: "Check the official notice for what is being asked." };
  if (/request for information|\bRFI\b|demande de renseignements/i.test(t))
    return { kind: "rfi", label: "Request for information", note: "Market research only — not a bid opportunity." };
  if (/advance contract award|\bACAN\b|préavis d'adjudication/i.test(t))
    return { kind: "acan", label: "Advance contract award notice", note: "The buyer intends to award to a named supplier. You can only challenge it by the deadline." };
  return { kind: "bid", label: t, note: null };
}

/** Start of "today" in Toronto as an ISO instant; notices closing before it are past. */
export function startOfTodayToronto(now = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const offsetMin = (() => {
    const s = new Intl.DateTimeFormat("en-US", { timeZone: "America/Toronto", timeZoneName: "shortOffset" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value || "GMT-5";
    const m = s.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : -300;
  })();
  const sign = offsetMin < 0 ? "-" : "+";
  const abs = Math.abs(offsetMin);
  return new Date(`${ymd}T00:00:00${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`).toISOString();
}

/** Exact public wording for the verified CanadaBuys figure (launch/data/figure_verification.md). */
export const CANADABUYS_NOV9_FIGURE = "924 tender notices were listed as open on CanadaBuys on Nov 9, 2026.";
