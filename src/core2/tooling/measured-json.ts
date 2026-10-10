/** Buffered standard JSON for measurement-only plain records; never an aggregate JSON string. */
import { createHash } from "node:crypto";
import { closeSync, openSync, writeSync } from "node:fs";
import { parameter as p } from "../parameters";

export interface MeasuredJsonOptions {
  trailingNewline?: boolean;
  pretty?: boolean;
}

/** The consumer must use each buffer synchronously before it is reused. */
export function streamMeasuredJson(
  value: unknown,
  consume: (chunk: Buffer) => void,
  options: MeasuredJsonOptions = {},
): number {
  const buffer = Buffer.alloc(p("bytesPerMiB")),
    ancestors = new Set<object>(),
    gap = options.pretty ? " ".repeat(p("two")) : "";
  let used = p("zero"),
    bytes = p("zero");
  const deliver = (chunk: Buffer) => {
    bytes += chunk.length;
    if (!Number.isSafeInteger(bytes))
      throw new Error("Measured JSON export byte count overflows.");
    consume(chunk);
  };
  const flush = () => {
    if (used > p("zero")) deliver(buffer.subarray(p("zero"), used));
    used = p("zero");
  };
  const write = (text: string) => {
    const length = Buffer.byteLength(text, "utf8");
    if (length <= buffer.length) {
      if (used + length > buffer.length) flush();
      used += buffer.write(text, used, length, "utf8");
    } else {
      flush();
      const data = Buffer.from(text, "utf8");
      for (
        let offset = p("zero");
        offset < data.length;
        offset += buffer.length
      )
        deliver(data.subarray(offset, offset + buffer.length));
    }
  };
  const omitted = (row: unknown) =>
    row === undefined || typeof row === "function" || typeof row === "symbol";
  const encode = (row: unknown, indent: string): void => {
    if (row === null || typeof row !== "object") {
      const text = JSON.stringify(row);
      if (text === undefined)
        throw new TypeError(
          "Measured JSON requires a JSON-compatible root value.",
        );
      write(text);
      return;
    }
    const array = Array.isArray(row),
      prototype = Object.getPrototypeOf(row);
    if (
      (!array && prototype !== Object.prototype && prototype !== null) ||
      typeof (row as { toJSON?: unknown }).toJSON === "function"
    )
      throw new TypeError(
        "Measured JSON requires plain records without toJSON.",
      );
    if (ancestors.has(row))
      throw new TypeError("Converting circular structure to JSON");
    ancestors.add(row);
    try {
      const childIndent = indent + gap;
      let emitted = false;
      const separator = () => {
        if (emitted) write(",");
        if (gap) {
          write("\n");
          write(childIndent);
        }
        emitted = true;
      };
      write(array ? "[" : "{");
      if (array) {
        const length = row.length;
        for (let index = p("zero"); index < length; index += p("one")) {
          separator();
          const entry = row[index];
          encode(omitted(entry) ? null : entry, childIndent);
        }
      } else {
        for (const key of Object.keys(row)) {
          const entry = (row as Record<string, unknown>)[key];
          if (omitted(entry)) continue;
          separator();
          write(JSON.stringify(key));
          write(gap ? ": " : ":");
          encode(entry, childIndent);
        }
      }
      if (gap && emitted) {
        write("\n");
        write(indent);
      }
      write(array ? "]" : "}");
    } finally {
      ancestors.delete(row);
    }
  };
  encode(value, "");
  if (options.trailingNewline) write("\n");
  flush();
  return bytes;
}

export function hashMeasuredJson(value: unknown): string {
  const hash = createHash("sha256");
  streamMeasuredJson(value, (chunk) => {
    hash.update(chunk);
  });
  return hash.digest("hex");
}

/** Exclusive-create exports; default retains the measured-input/producer newline. */
export function writeMeasuredJson(
  path: string,
  value: unknown,
  options: MeasuredJsonOptions = { trailingNewline: true },
) {
  const fd = openSync(path, "wx"),
    hash = createHash("sha256");
  let bytes: number;
  try {
    bytes = streamMeasuredJson(
      value,
      (chunk) => {
        let offset = p("zero");
        while (offset < chunk.length) {
          const written = writeSync(fd, chunk, offset, chunk.length - offset);
          if (written <= p("zero"))
            throw new Error("Measured JSON export did not write its bytes.");
          offset += written;
        }
        hash.update(chunk);
      },
      options,
    );
  } finally {
    closeSync(fd);
  }
  return { path, sha256: hash.digest("hex"), bytes };
}
