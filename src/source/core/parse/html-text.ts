/**
 * Turning a retrieved HTML page into text a citation can be checked against.
 *
 * A transcription-based domain says KNOWN only when the excerpt it quotes is
 * literally present in the bytes the lock pins. That check needs one
 * normalization both sides agree on, and it has to be the dullest possible one
 * — a normalizer that rewrote words could make a quotation "match" a page that
 * does not contain it, which is the failure this whole design exists to
 * prevent.
 *
 * So: script and style blocks go, tags become spaces, a fixed entity table is
 * decoded, and runs of whitespace collapse. Nothing is lowercased, nothing is
 * stemmed, no punctuation is rewritten and no word is touched. A publisher who
 * changes "thirty-five" to "35" breaks the match, and that is correct — the
 * sentence this repository read is no longer the sentence on the page.
 *
 * It lives in the core rather than in one domain because the rights boundary
 * depends on it: an enacted-text scope is a span of this normalized text, and
 * the capability layer cuts that span before any compiler sees bytes.
 */

const ENTITIES: ReadonlyMap<string, string> = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
  ["ndash", "–"],
  ["mdash", "—"],
  ["lsquo", "‘"],
  ["rsquo", "’"],
  ["ldquo", "“"],
  ["rdquo", "”"],
  ["sect", "§"],
  ["para", "¶"],
  ["hellip", "…"],
]);

function decodeEntity(entity: string): string {
  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    const code = Number.parseInt(entity.slice(2), 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
  }
  if (entity.startsWith("#")) {
    const code = Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
  }
  return ENTITIES.get(entity) ?? `&${entity};`;
}

/** The encodings this substrate will decode retrieved publisher bytes in. */
export type RetrievedTextEncoding = "utf-8" | "windows-1252";

/**
 * Windows-1252's upper range, decoded here rather than by the host.
 *
 * `TextDecoder` is only required to support UTF-8. Support for the legacy
 * single-byte encodings depends on the ICU data the running Node was built
 * with, and when it is absent the degradation is silent: on a full-ICU host
 * `new TextDecoder("windows-1252")` maps 0x97 to an em dash, while a host
 * without that data decodes the same byte as U+0097, a C1 control character
 * that renders as nothing at all. Same bytes, same code, two different texts.
 *
 * That is not cosmetic here. An enacted-text scope pins the SHA-256 of the text
 * its boundary extracts, so a decoder that varies by machine turns a rights
 * determination into something that holds or fails depending on where it ran —
 * and the refusal reads "the scope of the edict determination has moved" when
 * nothing moved except the runtime.
 *
 * So the mapping lives here, as data. This is the WHATWG index for 0x80-0x9F,
 * the only range where Windows-1252 and ISO-8859-1 disagree; every other byte
 * is its own code point. The five positions Windows-1252 leaves unassigned
 * decode to their C1 code points, as the standard requires, rather than to
 * U+FFFD: dropping a byte the publisher actually sent would be its own kind of
 * silent rewrite.
 */
const WINDOWS_1252_UPPER_RANGE =
  "€\u0081‚ƒ„…†‡" + // 0x80-0x87
  "ˆ‰Š‹Œ\u008dŽ\u008f" + // 0x88-0x8f
  "\u0090‘’“”•–—" + // 0x90-0x97
  "˜™š›œ\u009džŸ"; // 0x98-0x9f

function decodeWindows1252(bytes: Uint8Array): string {
  const units = new Array<string>(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index]!;
    units[index] =
      byte >= 0x80 && byte <= 0x9f
        ? WINDOWS_1252_UPPER_RANGE[byte - 0x80]!
        : String.fromCharCode(byte);
  }
  return units.join("");
}

/**
 * Decode retrieved bytes the same way on every host.
 *
 * UTF-8 goes through `TextDecoder`, which every Node build supports and which
 * no ICU configuration alters. Windows-1252 goes through the table above.
 */
export function decodeRetrievedBytes(
  bytes: Uint8Array,
  encoding: RetrievedTextEncoding,
): string {
  return encoding === "windows-1252"
    ? decodeWindows1252(bytes)
    : new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/**
 * Which encoding a media type declares.
 *
 * `iso-8859-1` resolves to Windows-1252 because that is what the WHATWG
 * encoding standard requires of it, and because publishers who label a page
 * ISO-8859-1 overwhelmingly serve Windows-1252 bytes. Anything else is read as
 * UTF-8 rather than guessed at.
 */
function declaredEncoding(
  mediaType: string | undefined,
): RetrievedTextEncoding {
  if (!mediaType) return "utf-8";
  const charset = /(?:^|;)\s*charset\s*=\s*["']?([^;"'\s]+)/i.exec(
    mediaType,
  )?.[1];
  const normalized = charset?.toLowerCase();
  return normalized === "windows-1252" || normalized === "iso-8859-1"
    ? "windows-1252"
    : "utf-8";
}

/**
 * The normalized text of a retrieved page.
 *
 * Deliberately total: an artifact this substrate cannot decode still produces a
 * string, and the excerpt check then simply fails to find its quotation. A
 * throw here would turn "this page is not what we thought" into a build crash
 * rather than a missing fact.
 */
export function normalizeRetrievedText(
  bytes: Uint8Array,
  mediaType?: string,
): string {
  const raw = decodeRetrievedBytes(bytes, declaredEncoding(mediaType));
  const withoutScripts = raw
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const withoutTags = withoutScripts.replace(/<[^>]*>/g, " ");
  const decoded = withoutTags.replace(
    /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z]{2,8});/g,
    (_match, entity: string) => decodeEntity(entity),
  );
  return decoded.replace(/[\s\u00a0\u2007\u202f]+/g, " ").trim();
}

/** Whether a normalized page contains an excerpt, after the same collapsing. */
export function containsExcerpt(pageText: string, excerpt: string): boolean {
  const wanted = excerpt.replace(/[\s\u00a0]+/g, " ").trim();
  if (wanted === "") return false;
  return pageText.includes(wanted);
}
