import { unzipSync, strFromU8 } from "fflate";

/**
 * Extract the first CSV entry from a ZIP archive held in memory.
 * Pure JS (fflate, MIT) — no OS `unzip` binary, no temp files on disk.
 * Throws if the archive has no CSV, or if the uncompressed CSV exceeds maxBytes.
 */
export function extractFirstCsvFromZip(
  zip: Uint8Array,
  opts?: { maxBytes?: number }
): { name: string; text: string; bytes: number } {
  const maxBytes = opts?.maxBytes ?? 200 * 1024 * 1024;
  let picked: string | null = null;
  const files = unzipSync(zip, {
    // Only inflate the first .csv entry; skip everything else.
    filter: (file) => {
      if (picked) return false;
      if (!file.name.toLowerCase().endsWith(".csv")) return false;
      if (file.originalSize > maxBytes) {
        throw new Error(
          `CSV entry ${file.name} is ${file.originalSize} bytes, above limit ${maxBytes}`
        );
      }
      picked = file.name;
      return true;
    },
  });
  if (!picked) throw new Error("No CSV in ZIP archive");
  const data = files[picked];
  if (!data) throw new Error(`ZIP entry ${picked} could not be read`);
  // Strip UTF-8 BOM if present.
  let text = strFromU8(data);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return { name: picked, text, bytes: data.length };
}
