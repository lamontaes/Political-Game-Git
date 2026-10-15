/**
 * JSON text kept and read as a list of pieces instead of one string.
 *
 * A twenty-year world written out is longer than the longest string
 * JavaScript can hold (a little over 536 million characters), so a save that
 * size cannot be built with `JSON.stringify` or read back with `JSON.parse`.
 * These write the same text in pieces of a bounded length, and read such
 * pieces back into the value `JSON.parse` would give for their joined text.
 * The pieces may be cut anywhere: inside a string, a number or a word.
 */

/** Where a save is cut into pieces: well under the longest string. */
export const JSON_CHUNK_LENGTH = 16 * 1024 * 1024;

/**
 * Gathers the parts `write` emits into pieces of about `chunkLength`
 * characters. A single part longer than that stays whole in its own piece.
 * There is always at least one piece.
 */
export function collectJsonChunks(
  write: (emit: (part: string) => void) => void,
  chunkLength: number = JSON_CHUNK_LENGTH,
): string[] {
  const chunks: string[] = [];
  let pending: string[] = [];
  let length = 0;
  write((part) => {
    pending.push(part);
    length += part.length;
    if (length >= chunkLength) {
      chunks.push(pending.join(""));
      pending = [];
      length = 0;
    }
  });
  if (pending.length > 0 || chunks.length === 0) chunks.push(pending.join(""));
  return chunks;
}

/** The total length of text held in pieces. */
export function jsonChunksLength(chunks: readonly string[]): number {
  let length = 0;
  for (const chunk of chunks) length += chunk.length;
  return length;
}

/**
 * Whether two texts held in pieces are the same text, however each was cut.
 */
export function sameJsonChunks(
  left: readonly string[],
  right: readonly string[],
): boolean {
  let li = 0;
  let lo = 0;
  let ri = 0;
  let ro = 0;
  for (;;) {
    while (li < left.length && lo >= left[li]!.length) {
      li += 1;
      lo = 0;
    }
    while (ri < right.length && ro >= right[ri]!.length) {
      ri += 1;
      ro = 0;
    }
    if (li >= left.length || ri >= right.length)
      return li >= left.length && ri >= right.length;
    const l = left[li]!;
    const r = right[ri]!;
    const span = Math.min(l.length - lo, r.length - ro);
    if (
      (lo === 0 && ro === 0 && span === l.length && span === r.length
        ? l
        : l.slice(lo, lo + span)) !==
      (lo === 0 && ro === 0 && span === l.length && span === r.length
        ? r
        : r.slice(ro, ro + span))
    )
      return false;
    lo += span;
    ro += span;
  }
}

// What the reader expects next.
const VALUE = 0;
const VALUE_OR_ARRAY_END = 1;
const KEY_OR_OBJECT_END = 2;
const KEY = 3;
const COLON = 4;
const COMMA_OR_END = 5;
const DONE = 6;

type Frame =
  | { readonly array: unknown[] }
  | { readonly object: Record<string, unknown>; key: string };

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f]/;

const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

function isSpace(code: number): boolean {
  return code === 0x20 || code === 0x0a || code === 0x0d || code === 0x09;
}

function isNumberPart(code: number): boolean {
  return (
    (code >= 0x30 && code <= 0x39) ||
    code === 0x2d ||
    code === 0x2b ||
    code === 0x2e ||
    code === 0x65 ||
    code === 0x45
  );
}

/**
 * The value `JSON.parse(chunks.join(""))` would give, without ever joining
 * the pieces. Throws a `SyntaxError` on text that is not JSON.
 */
export function parseJsonChunks(chunks: Iterable<string>): unknown {
  const stack: Frame[] = [];
  let expect: number = VALUE;
  let root: unknown;
  let consumed = 0;
  let carry = "";

  const fail = (at: number, what: string): never => {
    throw new SyntaxError(`${what} in JSON at position ${consumed + at}`);
  };

  const place = (value: unknown): void => {
    const top = stack[stack.length - 1];
    if (top === undefined) {
      root = value;
      expect = DONE;
    } else if ("array" in top) {
      top.array.push(value);
      expect = COMMA_OR_END;
    } else {
      if (top.key === "__proto__")
        Object.defineProperty(top.object, top.key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      else top.object[top.key] = value;
      expect = COMMA_OR_END;
    }
  };

  // Reads from `text`; returns where an unfinished token starts, or
  // `text.length` when everything was read.
  const run = (text: string, final: boolean): number => {
    let at = 0;
    const length = text.length;
    while (at < length) {
      const code = text.charCodeAt(at);
      if (isSpace(code)) {
        at += 1;
        continue;
      }
      switch (expect) {
        case DONE:
          fail(at, "Unexpected non-whitespace character after JSON");
          break;
        case COLON:
          if (code !== 0x3a) fail(at, "Expected ':'");
          at += 1;
          expect = VALUE;
          break;
        case COMMA_OR_END: {
          const top = stack[stack.length - 1]!;
          if (code === 0x2c) {
            at += 1;
            expect = "array" in top ? VALUE : KEY;
          } else if (code === 0x5d && "array" in top) {
            at += 1;
            stack.pop();
            place(top.array);
          } else if (code === 0x7d && "object" in top) {
            at += 1;
            stack.pop();
            place(top.object);
          } else fail(at, "Expected ',' or the end of a container");
          break;
        }
        case KEY_OR_OBJECT_END:
        case KEY: {
          if (code === 0x7d && expect === KEY_OR_OBJECT_END) {
            at += 1;
            const top = stack.pop() as { object: Record<string, unknown> };
            place(top.object);
            break;
          }
          if (code !== 0x22) fail(at, "Expected a property name");
          const end = stringEnd(text, at);
          if (end < 0) return at;
          (stack[stack.length - 1] as { key: string }).key = stringValue(
            text,
            at,
            end,
          );
          at = end + 1;
          expect = COLON;
          break;
        }
        case VALUE:
        case VALUE_OR_ARRAY_END: {
          if (code === 0x5d && expect === VALUE_OR_ARRAY_END) {
            at += 1;
            const top = stack.pop() as { array: unknown[] };
            place(top.array);
            break;
          }
          if (code === 0x7b) {
            at += 1;
            stack.push({ object: {}, key: "" });
            expect = KEY_OR_OBJECT_END;
          } else if (code === 0x5b) {
            at += 1;
            stack.push({ array: [] });
            expect = VALUE_OR_ARRAY_END;
          } else if (code === 0x22) {
            const end = stringEnd(text, at);
            if (end < 0) return at;
            const value = stringValue(text, at, end);
            at = end + 1;
            place(value);
          } else if (code === 0x74 || code === 0x66 || code === 0x6e) {
            const word =
              code === 0x74 ? "true" : code === 0x66 ? "false" : "null";
            if (length - at < word.length) {
              if (final) fail(at, "Unexpected end");
              return at;
            }
            if (!text.startsWith(word, at)) fail(at, "Unexpected token");
            at += word.length;
            place(code === 0x74 ? true : code === 0x66 ? false : null);
          } else if (code === 0x2d || (code >= 0x30 && code <= 0x39)) {
            let end = at + 1;
            while (end < length && isNumberPart(text.charCodeAt(end))) end += 1;
            if (end === length && !final) return at;
            const token = text.slice(at, end);
            if (!NUMBER.test(token)) fail(at, "Invalid number");
            at = end;
            place(Number(token));
          } else fail(at, "Unexpected token");
          break;
        }
      }
    }
    return length;
  };

  for (const chunk of chunks) {
    const text = carry.length > 0 ? carry + chunk : chunk;
    const stop = run(text, false);
    consumed += stop;
    carry = stop < text.length ? text.slice(stop) : "";
  }
  if (carry.length > 0) {
    const stop = run(carry, true);
    if (stop < carry.length) fail(stop, "Unterminated string");
  }
  if (expect !== DONE) fail(0, "Unexpected end of JSON input");
  return root;
}

/** The index of the quote closing the string opened at `start`, or -1. */
function stringEnd(text: string, start: number): number {
  let from = start + 1;
  for (;;) {
    const quote = text.indexOf('"', from);
    if (quote < 0) return -1;
    let slashes = 0;
    for (
      let at = quote - 1;
      at > start && text.charCodeAt(at) === 0x5c;
      at -= 1
    )
      slashes += 1;
    if (slashes % 2 === 0) return quote;
    from = quote + 1;
  }
}

function stringValue(text: string, start: number, end: number): string {
  const raw = text.slice(start + 1, end);
  if (raw.indexOf("\\") < 0) {
    if (CONTROL.test(raw))
      throw new SyntaxError("Bad control character in string literal");
    return raw;
  }
  return JSON.parse(text.slice(start, end + 1)) as string;
}
