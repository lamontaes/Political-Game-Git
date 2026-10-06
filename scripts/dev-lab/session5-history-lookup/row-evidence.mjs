import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

// Canonicalize only JSON key order. Retain every serialized field and array order.
export function stableRecordJson(serialized) {
  const sort = (value) => {
    if (Array.isArray(value)) return value.map(sort);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, sort(value[key])]),
      );
    return value;
  };
  return JSON.stringify(sort(JSON.parse(serialized)));
}

export function createPacketBudget(limitBytes = 16 * 1024 ** 2) {
  return { limitBytes, usedBytes: 0 };
}

export function captureRowPacket(budget, lines, family, index, serialized) {
  const line = `${JSON.stringify({ family, index }).slice(0, -1)},"row":${serialized}}\n`;
  const bytes = Buffer.byteLength(line);
  if (budget.usedBytes + bytes > budget.limitBytes)
    throw new Error(
      `Record packet budget exceeded: ${budget.limitBytes} bytes; parity capture incomplete`,
    );
  budget.usedBytes += bytes;
  lines.push(line);
}

export function createFamilyDigest(family) {
  const hash = createHash("sha256").update(
    `session5-appended-records/v1:${family}\n`,
  );
  let rows = 0;
  return {
    add(serialized) {
      const stable = stableRecordJson(serialized);
      hash
        .update(`${Buffer.byteLength(stable)}:`)
        .update(stable)
        .update("\n");
      rows++;
    },
    finish() {
      return {
        version: "session5-appended-records/v1",
        rows,
        sha256: hash.digest("hex"),
      };
    },
  };
}
