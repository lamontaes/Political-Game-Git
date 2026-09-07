/** A structural JPEG failure, never a reason to normalize the source pixels. */
export class JpegStructureError extends Error {}

/**
 * Measure 8-bit Huffman baseline/progressive JPEGs without decoding or writing
 * pixels. Walk the entire marker stream through EOI, including entropy byte
 * stuffing and restart markers; a SOF alone is not a complete image.
 * This validates container structure, not entropy coefficients or visual quality.
 * Other JPEG coding processes and deferred-height (DNL) files fail closed.
 */
export function readJpegDimensions(bytes: Buffer): {
  width: number;
  height: number;
} {
  const fail = (reason: string): never => {
    throw new JpegStructureError(`JPEG structure: ${reason}`);
  };
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) fail("missing SOI signature.");
  let offset = 2;
  let frame: { width: number; height: number } | undefined;
  let progressive = false;
  const components = new Set<number>();
  const quantizationTables = new Set<number>();
  const huffmanTables = new Set<number>();
  const componentTables = new Map<number, number>();
  let expectedRestart = 0;
  let scans = 0;
  let inScan = false;
  let entropyBytes = 0;
  let restartInterval = 0;
  while (offset < bytes.length) {
    if (inScan && bytes[offset] !== 0xff) {
      entropyBytes++;
      offset++;
      continue;
    }
    if (bytes[offset++] !== 0xff) fail("expected marker prefix.");
    const markerStart = offset - 1;
    while (bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) fail("truncated marker.");
    const marker = bytes[offset++]!;
    if (inScan && marker === 0x00) {
      if (offset - markerStart !== 2) fail("invalid stuffed byte.");
      entropyBytes++;
      continue;
    }
    if (inScan && marker >= 0xd0 && marker <= 0xd7) {
      if (!restartInterval || !entropyBytes) fail("unexpected restart marker.");
      if (marker !== 0xd0 + expectedRestart)
        fail("out-of-order restart marker.");
      expectedRestart = (expectedRestart + 1) % 8;
      continue;
    }
    if (inScan) {
      if (!entropyBytes) fail("empty scan.");
      inScan = false;
    }
    if (marker === 0xd9) {
      if (!frame || !scans) fail("EOI before frame and scan.");
      if (offset !== bytes.length) fail("trailing bytes after EOI.");
      return frame!;
    }
    if (
      marker === 0x00 ||
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    )
      fail("unexpected standalone marker.");
    if (offset + 2 > bytes.length) fail("truncated segment length.");
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length)
      fail("invalid or truncated segment length.");
    const end = offset + length;
    const start = offset + 2;
    if (marker === 0xc0 || marker === 0xc2) {
      if (frame || scans || length < 11) fail("invalid or repeated frame.");
      const count = bytes[start + 5]!;
      if (bytes[start] !== 8 || !count || count > 4 || length !== 8 + 3 * count)
        fail("unsupported or malformed frame.");
      const height = bytes.readUInt16BE(start + 1);
      const width = bytes.readUInt16BE(start + 3);
      if (!width || !height) fail("zero or deferred dimensions.");
      for (let i = start + 6; i < end; i += 3) {
        const id = bytes[i]!;
        const sampling = bytes[i + 1]!;
        if (
          components.has(id) ||
          !(sampling >> 4) ||
          sampling >> 4 > 4 ||
          !(sampling & 15) ||
          (sampling & 15) > 4 ||
          bytes[i + 2]! > 3
        )
          fail("invalid frame component.");
        components.add(id);
        componentTables.set(id, bytes[i + 2]!);
      }
      frame = { width, height };
      progressive = marker === 0xc2;
    } else if (marker === 0xda) {
      const count = bytes[start]!;
      if (
        !frame ||
        !count ||
        count > components.size ||
        length !== 6 + 2 * count
      )
        fail("invalid scan header.");
      const seen = new Set<number>();
      for (let i = start + 1; i < start + 1 + 2 * count; i += 2) {
        const id = bytes[i]!;
        const tables = bytes[i + 1]!;
        if (
          !components.has(id) ||
          seen.has(id) ||
          tables >> 4 > 3 ||
          (tables & 15) > 3
        )
          fail("invalid scan component.");
        if (!quantizationTables.has(componentTables.get(id)!))
          fail("missing quantization table.");
        const first = bytes[end - 3]!;
        const approximationHigh = bytes[end - 1]! >> 4;
        if (
          (!progressive || (first === 0 && approximationHigh === 0)) &&
          !huffmanTables.has(tables >> 4)
        )
          fail("missing DC Huffman table.");
        if (
          (!progressive || first > 0) &&
          !huffmanTables.has(0x10 | (tables & 15))
        )
          fail("missing AC Huffman table.");
        seen.add(id);
      }
      const first = bytes[end - 3]!;
      const last = bytes[end - 2]!;
      const approx = bytes[end - 1]!;
      if (
        progressive
          ? first > last ||
            last > 63 ||
            (first === 0 && last !== 0) ||
            (first > 0 && count !== 1) ||
            approx >> 4 > 13 ||
            (approx & 15) > 13 ||
            (approx >> 4 !== 0 && approx >> 4 !== (approx & 15) + 1)
          : first !== 0 || last !== 63 || approx !== 0
      )
        fail("invalid scan parameters.");
      scans++;
      inScan = true;
      entropyBytes = 0;
      expectedRestart = 0;
    } else if (marker === 0xdd) {
      if (length !== 4) fail("invalid restart interval.");
      restartInterval = bytes.readUInt16BE(start);
    } else if (marker === 0xdb || marker === 0xc4) {
      let cursor = start;
      if (cursor === end) fail("empty table segment.");
      while (cursor < end) {
        const info = bytes[cursor++]!;
        if ((info & 15) > 3 || info >> 4 > 1) fail("invalid table selector.");
        if (marker === 0xdb) {
          quantizationTables.add(info & 15);
          const precision = (info >> 4) + 1;
          if (cursor + 64 * precision > end)
            fail("truncated quantization table.");
          for (let i = 0; i < 64; i++) {
            const value =
              precision === 1 ? bytes[cursor]! : bytes.readUInt16BE(cursor);
            if (!value) fail("zero quantization value.");
            cursor += precision;
          }
        } else {
          huffmanTables.add(info);
          if (cursor + 16 > end) fail("truncated Huffman counts.");
          let symbols = 0;
          let availableCodes = 1;
          for (let i = 0; i < 16; i++) {
            const count = bytes[cursor++]!;
            symbols += count;
            availableCodes = 2 * availableCodes - count;
            if (availableCodes <= 0) fail("oversubscribed Huffman table.");
          }
          if (!symbols || symbols > 256) fail("invalid Huffman symbol count.");
          cursor += symbols;
        }
        if (cursor > end) fail("truncated table.");
      }
    } else if (!(marker >= 0xe0 && marker <= 0xef) && marker !== 0xfe) {
      fail(`unsupported marker 0x${marker.toString(16)}.`);
    }
    offset = end;
  }
  return fail("missing EOI (truncated JPEG).");
}
