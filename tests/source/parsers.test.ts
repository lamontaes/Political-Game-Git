/**
 * The parser battery.
 *
 * 32A §7's malformed-input list, run against the readers that replaced
 * `line.split(delimiter)`. Each case is one thing a naive split gets wrong
 * silently: an embedded delimiter shifts every later column, an embedded
 * newline halves a record, a doubled quote swallows a field, and a trailing
 * empty cell disappears.
 */

import { describe, expect, it } from "vitest";
import {
  parseBlsTimeSeries,
  parseDelimited,
  parseFixedWidth,
  listZipMembers,
  readSoleZipMember,
  readZipMember,
  listXlsxSheets,
  readXlsxSheet,
} from "../../src/source/core/index";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";

const bytes = (text: string): Buffer => Buffer.from(text, "utf-8");
const REPO = resolve(import.meta.dirname, "../..");

describe("A12 / A13 — the delimited parser", () => {
  it("keeps a delimiter that sits inside a quoted field", () => {
    const result = parseDelimited(bytes('a,"b,c",d\n'), { delimiter: "," });
    expect(result.rows[0]?.fields).toEqual(["a", "b,c", "d"]);
  });

  it("keeps a newline that sits inside a quoted field, and counts lines past it", () => {
    const result = parseDelimited(bytes('a,"line one\nline two",c\nd,e,f\n'), {
      delimiter: ",",
    });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.fields[1]).toBe("line one\nline two");
    expect(result.rows[1]?.fields).toEqual(["d", "e", "f"]);
  });

  it("reads a doubled quote as one literal quote", () => {
    const result = parseDelimited(bytes('a,"say ""hello""",c\n'), {
      delimiter: ",",
    });
    expect(result.rows[0]?.fields).toEqual(["a", 'say "hello"', "c"]);
  });

  it("preserves a trailing empty cell, and keeps it distinct from an absent one", () => {
    const withTrailing = parseDelimited(bytes("a,b,\n"), { delimiter: "," });
    expect(withTrailing.rows[0]?.fields).toEqual(["a", "b", ""]);
    const withoutTrailing = parseDelimited(bytes("a,b\n"), { delimiter: "," });
    expect(withoutTrailing.rows[0]?.fields).toEqual(["a", "b"]);
  });

  it("strips a byte-order mark and records that it was there", () => {
    const withBom = parseDelimited(
      Buffer.from("\uFEFFid,name\n1,x\n", "utf-8"),
      {
        delimiter: ",",
        hasHeaderRow: true,
      },
    );
    expect(withBom.hadByteOrderMark).toBe(true);
    expect(withBom.header).toEqual(["id", "name"]);
    const withoutBom = parseDelimited(bytes("id,name\n1,x\n"), {
      delimiter: ",",
      hasHeaderRow: true,
    });
    expect(withoutBom.hadByteOrderMark).toBe(false);
  });

  it("reads CRLF and LF alike", () => {
    const crlf = parseDelimited(bytes("a,b\r\nc,d\r\n"), { delimiter: "," });
    const lf = parseDelimited(bytes("a,b\nc,d\n"), { delimiter: "," });
    expect(crlf.rows.map((row) => row.fields)).toEqual(
      lf.rows.map((row) => row.fields),
    );
  });

  it("reports an over-wide and an under-wide row as named defects rather than shifting them", () => {
    const result = parseDelimited(bytes("a,b,c\n1,2,3\n1,2\n1,2,3,4\n"), {
      delimiter: ",",
      hasHeaderRow: true,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.defects.map((defect) => defect.kind).sort()).toEqual([
      "row-too-narrow",
      "row-too-wide",
    ]);
    expect(result.defects[0]?.line).toBeGreaterThan(0);
  });

  it("reports an unterminated quote rather than silently swallowing the file", () => {
    const result = parseDelimited(bytes('a,"never closed\n'), {
      delimiter: ",",
    });
    expect(
      result.defects.some((defect) => defect.kind === "unterminated-quote"),
    ).toBe(true);
  });

  it("reports bytes that are not valid in the declared encoding", () => {
    const latin1 = Buffer.from([0x44, 0x6f, 0xf1, 0x61, 0x0a]); // "Doña" in Latin-1
    const asUtf8 = parseDelimited(latin1, { delimiter: "," });
    expect(
      asUtf8.defects.some((defect) => defect.kind === "non-utf8-byte"),
    ).toBe(true);
    const asLatin1 = parseDelimited(latin1, {
      delimiter: ",",
      encoding: "latin1",
    });
    expect(asLatin1.defects).toHaveLength(0);
    expect(asLatin1.rows[0]?.fields[0]).toBe("Doña");
  });

  it("opens a quoted field after padding only when a domain asks it to", () => {
    const strict = parseDelimited(bytes(' "00000",x\n'), {
      delimiter: ",",
      trimFields: true,
    });
    expect(strict.rows[0]?.fields[0]).toBe('"00000"');
    const lenient = parseDelimited(bytes(' "00000",x\n'), {
      delimiter: ",",
      trimFields: true,
      allowWhitespaceBeforeQuote: true,
    });
    expect(lenient.rows[0]?.fields[0]).toBe("00000");
  });

  it("refuses a multi-character delimiter", () => {
    expect(() => parseDelimited(bytes("a\n"), { delimiter: "||" })).toThrow(
      /one character/,
    );
  });
});

describe("the fixed-width parser", () => {
  const fields = [
    { name: "code", span: [0, 3] as const, trailingSpaces: "trimmed" as const },
    {
      name: "name",
      span: [3, 13] as const,
      trailingSpaces: "significant" as const,
    },
  ];

  it("reads declared spans and honours per-field trailing-space semantics", () => {
    const result = parseFixedWidth(bytes("ABC Alpha    \n"), { fields });
    expect(result.rows[0]?.values.code).toBe("ABC");
    expect(result.rows[0]?.values.name).toBe("Alpha    ");
  });

  it("reports a short line as a defect rather than truncating it", () => {
    const result = parseFixedWidth(bytes("AB\n"), { fields });
    expect(result.rows).toHaveLength(0);
    expect(result.defects[0]?.kind).toBe("line-too-short");
  });
});

describe("the BLS dialect parser", () => {
  it("reads tab-separated padded columns and keeps an empty footnote column", () => {
    const file =
      "series_id                     \tyear\tperiod\t       value\tfootnote_codes\r\n" +
      "LASST010000000000003          \t2024\tM01\t         3.1\t\r\n" +
      "LASST010000000000003          \t2024\tM02\t         3.2\tP\r\n";
    const result = parseBlsTimeSeries(bytes(file));
    expect(result.header).toEqual([
      "series_id",
      "year",
      "period",
      "value",
      "footnote_codes",
    ]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.values.series_id).toBe("LASST010000000000003");
    expect(result.rows[0]?.values.footnote_codes).toBe("");
    expect(result.rows[1]?.values.footnote_codes).toBe("P");
  });

  it("reports a row whose column count disagrees with the header", () => {
    const result = parseBlsTimeSeries(bytes("a\tb\n1\t2\n1\n"));
    expect(result.rows).toHaveLength(1);
    expect(result.defects[0]?.kind).toBe("row-too-narrow");
  });

  it("returns nothing rather than guessing when the file is empty", () => {
    expect(parseBlsTimeSeries(bytes("")).rows).toHaveLength(0);
  });
});

describe("the archive readers", () => {
  /** A minimal one-member zip, built here so the test owns its input. */
  function buildZip(name: string, content: Buffer): Buffer {
    const nameBytes = Buffer.from(name, "utf-8");
    const deflated = deflateRawSync(content);
    const crc = (() => {
      let c = ~0;
      for (const byte of content) {
        c ^= byte;
        for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
      }
      return ~c >>> 0;
    })();

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);

    const centralOffset = local.length + nameBytes.length + deflated.length;
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(1, 8);
    end.writeUInt16LE(1, 10);
    end.writeUInt32LE(central.length + nameBytes.length, 12);
    end.writeUInt32LE(centralOffset, 16);

    return Buffer.concat([local, nameBytes, deflated, central, nameBytes, end]);
  }

  it("extracts a deflated member byte-for-byte", () => {
    const content = Buffer.from("USPS|GEOID\nAL|01001\n".repeat(50), "utf-8");
    const archive = buildZip("member.txt", content);
    expect(listZipMembers(archive).map((member) => member.path)).toEqual([
      "member.txt",
    ]);
    expect(readZipMember(archive, "member.txt").equals(content)).toBe(true);
    expect(readSoleZipMember(archive).path).toBe("member.txt");
  });

  it("names what is inside when a member is asked for and absent", () => {
    const archive = buildZip("actual.txt", Buffer.from("x"));
    expect(() => readZipMember(archive, "wanted.txt")).toThrow(/actual\.txt/);
  });

  it("refuses bytes that are not a zip at all", () => {
    expect(() => listZipMembers(Buffer.from("not a zip"))).toThrow(
      /Not a ZIP archive/,
    );
  });

  it("gives a container and its member different digests, as the lock requires", () => {
    const content = Buffer.from("payload", "utf-8");
    const archive = buildZip("m.txt", content);
    const digest = (input: Buffer): string =>
      createHash("sha256").update(input).digest("hex");
    expect(digest(archive)).not.toBe(digest(readZipMember(archive, "m.txt")));
  });

  it("reads a real HUD workbook, including a blank cell that stays blank", () => {
    const workbook = readFileSync(
      resolve(REPO, "data/source/hud-housing/raw/FY25_FMRs.xlsx"),
    );
    expect(listXlsxSheets(workbook)).toContain("FY25_FMRs");
    const sheet = readXlsxSheet(workbook, "FY25_FMRs");
    expect(sheet.rows[0]).toContain("fmr_2");
    const townColumn = (sheet.rows[0] ?? []).indexOf("county_town_name");
    const blanks = sheet.rows
      .slice(1)
      .filter((row) => (row[townColumn] ?? "") === "");
    expect(blanks.length).toBeGreaterThan(0);
  });

  it("names the sheets it holds when one is asked for and absent", () => {
    const workbook = readFileSync(
      resolve(REPO, "data/source/hud-housing/raw/FY25_FMRs.xlsx"),
    );
    expect(() => readXlsxSheet(workbook, "Nope")).toThrow(/FY25_FMRs/);
  });
});
