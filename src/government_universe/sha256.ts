/**
 * Pure TypeScript SHA-256 implementation.
 *
 * Runs deterministically in any runtime (Node.js, Browser, Web Worker, React, Headless).
 * Zero external dependencies or node-specific imports.
 */

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function stringToUtf8Bytes(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      i++;
      const nextCode = str.charCodeAt(i);
      code = 0x10000 + (((code & 0x3ff) << 10) | (nextCode & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

export function sha256Hex(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? stringToUtf8Bytes(input) : input;
  let i: number;
  let j: number;
  let result = "";

  const words: number[] = [];
  const bitLength = bytes.length * 8;

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (i = 0; i < bytes.length; i++) {
    const byte = bytes[i] ?? 0;
    words[i >> 2] = (words[i >> 2] ?? 0) | (byte << ((3 - (i % 4)) * 8));
  }

  words[bitLength >> 5] =
    (words[bitLength >> 5] ?? 0) | (0x80 << (24 - (bitLength % 32)));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  for (let chunk = 0; chunk < words.length; chunk += 16) {
    const w: number[] = [];
    for (i = 0; i < 16; i++) {
      w[i] = words[chunk + i] ?? 0;
    }
    for (i = 16; i < 64; i++) {
      const s0 =
        rightRotate(w[i - 15] ?? 0, 7) ^
        rightRotate(w[i - 15] ?? 0, 18) ^
        ((w[i - 15] ?? 0) >>> 3);
      const s1 =
        rightRotate(w[i - 2] ?? 0, 17) ^
        rightRotate(w[i - 2] ?? 0, 19) ^
        ((w[i - 2] ?? 0) >>> 10);
      w[i] =
        (((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) & 0xffffffff) >>> 0;
    }

    let a = hash[0] ?? 0;
    let b = hash[1] ?? 0;
    let c = hash[2] ?? 0;
    let d = hash[3] ?? 0;
    let e = hash[4] ?? 0;
    let f = hash[5] ?? 0;
    let g = hash[6] ?? 0;
    let h = hash[7] ?? 0;

    for (i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + (k[i] ?? 0) + (w[i] ?? 0)) & 0xffffffff;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) & 0xffffffff;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) & 0xffffffff;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) & 0xffffffff;
    }

    hash[0] = ((hash[0] ?? 0) + a) & 0xffffffff;
    hash[1] = ((hash[1] ?? 0) + b) & 0xffffffff;
    hash[2] = ((hash[2] ?? 0) + c) & 0xffffffff;
    hash[3] = ((hash[3] ?? 0) + d) & 0xffffffff;
    hash[4] = ((hash[4] ?? 0) + e) & 0xffffffff;
    hash[5] = ((hash[5] ?? 0) + f) & 0xffffffff;
    hash[6] = ((hash[6] ?? 0) + g) & 0xffffffff;
    hash[7] = ((hash[7] ?? 0) + h) & 0xffffffff;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = ((hash[i] ?? 0) >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }

  return result;
}
