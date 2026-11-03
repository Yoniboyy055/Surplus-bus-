/** Minimal RFC4180-ish CSV parser (quoted fields, commas, newlines). No deps. */

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      continue;
    }
    if (c === "\r") continue;
    field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
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
