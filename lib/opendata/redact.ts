/**
 * Strip personal contact details from free-text open-data fields before they
 * are stored or shown. Government notices often embed the contracting
 * officer's name, email and phone; the official notice (linked from every row)
 * remains the place to find them. OGL licences exclude personal information.
 */
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?1[ .-]?)?\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b(?:\s*(?:ext\.?|x)\s*\d{1,6})?/gi;
const LABELLED_NAME =
  /\b(Contact(?:ing)?(?:\s+Authority)?|Contact\s+name|Name|Contracting\s+(?:Officer|Authority)|Procurement\s+(?:Officer|Specialist|Lead)|Supply\s+Specialist|Buyer|Attention|Attn)\s*:\s*([A-Z][a-zA-Z'’.-]*(?:\s+[A-Z][a-zA-Z'’.-]*){1,3})/g;

const CONTACT_PHRASE =
  /\b((?:please\s+)?(?:contact|call|e-?mail|reach|veuillez\s+communiquer\s+avec|communiquez\s+avec|contactez))\s+([A-Z][a-zA-Z'’.-]*(?:\s+[A-Z][a-zA-Z'’.-]*){1,3})/gi;
/** "For further information, please contact …" boilerplate tails add nothing for comps. */
const INFO_TAIL = /\s*-?\s*(?:for (?:further|more) information|pour (?:plus|de plus amples) (?:d'|de )?(?:information|renseignements))[\s\S]*$/i;

export const REDACTED_CONTACT = "[contact details on the official notice]";

export function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function redactContactDetails(text: string | null | undefined): string | null {
  if (text == null) return null;
  let t = decodeBasicEntities(text);
  t = t.replace(EMAIL, REDACTED_CONTACT);
  t = t.replace(PHONE, REDACTED_CONTACT);
  t = t.replace(LABELLED_NAME, (_m, label: string) => `${label}: ${REDACTED_CONTACT}`);
  t = t.replace(CONTACT_PHRASE, (m, verb: string, name: string) => {
    // The pattern is case-insensitive, so "Zelda Quintero at" can be captured. Treat only the
    // leading Capitalised words as the person (case-sensitive) and keep the rest of the text.
    const words = name.split(/\s+/);
    let k = 0;
    while (k < words.length && /^[A-Z][a-zA-Z'’.-]*$/.test(words[k]!)) k++;
    if (k < 2) return m;
    const rest = words.slice(k).join(" ");
    return `${verb} ${REDACTED_CONTACT}${rest ? " " + rest : ""}`;
  });
  // Collapse repeats like "[x] [x]"
  const esc = REDACTED_CONTACT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  t = t.replace(new RegExp(`(${esc})([\\s,;/]*(?:(?:at|or|and|ou|à)\\s+)?${esc})+`, "gi"), REDACTED_CONTACT);
  return t.replace(/\s+/g, " ").trim();
}

/** Remove "for more information, contact …" tails, then redact what remains. */
export function cleanLotText(text: string | null | undefined): string | null {
  const r = redactContactDetails(text);
  if (r == null) return null;
  return r.replace(INFO_TAIL, "").trim() || null;
}
