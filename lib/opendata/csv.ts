/** Minimal RFC4180-ish CSV parser (quoted fields, commas, newlines). No deps. */

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Slice-based scanner: avoids per-character string concatenation, which on the
  // ~40 MB GCSurplus CSV built rope strings and pushed RSS past 1.4 GB.
  // Semantics match the previous parser: "" escapes, \r dropped outside quotes,
  // blank lines skipped, trailing field without newline kept.
  const rows: string[][] = [];
  let row: string[] = [];
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const n = s.length;
  let i = 0;
  let pending = false; // a field has started on this row (for EOF handling)

  const endRow = () => {
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
    pending = false;
  };

  while (i < n) {
    let field = "";
    pending = true;
    // A field may mix quoted and unquoted segments (same as the old parser).
    for (;;) {
      if (i >= n) break;
      const c = s.charCodeAt(i);
      if (c === 34 /* " */) {
        i++;
        const parts: string[] = [];
        let segStart = i;
        for (;;) {
          const q = s.indexOf('"', i);
          if (q === -1) {
            parts.push(s.slice(segStart));
            i = n;
            break;
          }
          if (s.charCodeAt(q + 1) === 34) {
            parts.push(s.slice(segStart, q + 1));
            i = q + 2;
            segStart = i;
            continue;
          }
          parts.push(s.slice(segStart, q));
          i = q + 1;
          break;
        }
        field += parts.join("");
        continue;
      }
      if (c === 44 /* , */ || c === 10 /* \n */) break;
      // Unquoted run up to the next delimiter, quote or newline.
      let j = i;
      while (j < n) {
        const d = s.charCodeAt(j);
        if (d === 44 || d === 10 || d === 34) break;
        j++;
      }
      const run = s.slice(i, j);
      field += run.indexOf("\r") === -1 ? run : run.replace(/\r/g, "");
      i = j;
    }
    row.push(field);
    if (i >= n) break;
    const c = s.charCodeAt(i);
    i++;
    if (c === 10) endRow();
  }
  if (pending || row.length) {
    if (row.length) rows.push(row);
  }
  if (!rows.length) return { headers: [], rows: [] };
  const headerRow = rows[0] ?? [];
  const headers = headerRow.map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const obj: Record<string, string> = {};
    const cells = rows[r] ?? [];
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] ?? `col_${c}`;
      obj[key] = cells[c] ?? "";
    }
    out.push(obj);
  }
  return { headers, rows: out };
}

export function moneyToNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function provinceCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  const map: Record<string, string> = {
    alberta: "AB",
    "british columbia": "BC",
    manitoba: "MB",
    "new brunswick": "NB",
    "newfoundland and labrador": "NL",
    "newfoundland": "NL",
    "northwest territories": "NT",
    "nova scotia": "NS",
    nunavut: "NU",
    ontario: "ON",
    "prince edward island": "PE",
    quebec: "QC",
    québec: "QC",
    saskatchewan: "SK",
    yukon: "YT",
    canada: "CA",
  };
  if (/^[A-Z]{2}$/i.test(t)) return t.toUpperCase();
  return map[t.toLowerCase()] ?? t;
}
