/**
 * Parse defects.
 *
 * A parser returns rows *and* defects. It never drops a row silently and never
 * fills a short one: 13B D1 found `line.split(delimiter)` standing in for a
 * real parser, which shifts every column after an embedded delimiter and
 * reports nothing.
 */

export type ParseDefectKind =
  | "row-too-wide"
  | "row-too-narrow"
  | "unterminated-quote"
  | "line-too-short"
  | "non-utf8-byte"
  | "lone-surrogate"
  | "unparsable-record";

export interface ParseDefect {
  readonly kind: ParseDefectKind;
  /** 1-indexed line within the artifact, as a reader would count it. */
  readonly line: number;
  readonly message: string;
}

/** A parse result always reports both what it read and what it could not. */
export interface ParseResult<TRow> {
  readonly rows: readonly TRow[];
  readonly defects: readonly ParseDefect[];
  /** True when the artifact began with a UTF-8 byte-order mark. */
  readonly hadByteOrderMark: boolean;
}
