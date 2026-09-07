import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  corpusCanonicalDigest,
  isClean,
  readZipMember,
  sha256Hex,
} from "../../src/source/core/index";
import type { ArtifactLock, Evidence } from "../../src/source/core/index";
import { sourceDomain as finance } from "../../src/source/domains/government-finances/index";
import { sourceDomain as employment } from "../../src/source/domains/public-employment/index";
import {
  parseFinancePublisher,
  parseFinanceIdentities,
  parseFinanceCrosswalk,
  adaptFinancePublisher,
  financePublisherAmount,
  financePublisherEnding,
  financePublisherCategory,
} from "../../src/source/domains/government-finances/production";
import {
  parseEmploymentPublisher,
  parseEmploymentIdentities,
  adaptEmploymentPublisher,
} from "../../src/source/domains/public-employment/production";
import {
  cutPublisherRows as cutFinance,
  DATA_MEMBER as FIN_DATA,
  IDENTITY_MEMBER as FIN_ID,
} from "../../src/source/domains/government-finances/acquisition";
import {
  cutPublisherRows as cutEmployment,
  DATA_MEMBER as EMP_DATA,
  IDENTITY_MEMBER as EMP_ID,
} from "../../src/source/domains/public-employment/acquisition";
const root = resolve(import.meta.dirname, "../..");
const bytes = (d: string, f: string) =>
  readFileSync(resolve(root, `data/source/${d}/raw/${f}`));
const lock = (d: string): ArtifactLock =>
  JSON.parse(
    readFileSync(resolve(root, `data/source/${d}/artifact-lock.json`), "utf8"),
  ) as ArtifactLock;
const evidence: Evidence = {
  artifactId: "adversarial-publisher-shape",
  locator: {
    kind: "fixed-width-row",
    artifactId: "adversarial-publisher-shape",
    line: 1,
  },
};
const finRows = () =>
  parseFinancePublisher(bytes("government-finances", "data.txt"));
const finIds = () =>
  parseFinanceIdentities(bytes("government-finances", "identity.txt"));
const empRows = () =>
  parseEmploymentPublisher(bytes("public-employment", "data.txt"));
const empIds = () =>
  parseEmploymentIdentities(bytes("public-employment", "identity.txt"));
const crosswalk = () =>
  parseFinanceCrosswalk(bytes("government-finances", "pid-gid-crosswalk.zip"));

describe("SRC-CAP2 locked publisher production", () => {
  for (const domain of [finance, employment]) {
    it(`${domain.domain}: deterministic locked compile and validation`, () => {
      const result = domain.compileProduction(lock(domain.domain));
      expect(result.corpus.inputClass).toBe("production");
      expect(isClean(domain.validateCorpus(result as never))).toBe(true);
      expect(result.corpus.canonicalSha256).toBe(
        corpusCanonicalDigest<unknown>(result.records),
      );
      expect(domain.compileProduction(lock(domain.domain))).toEqual(result);
      expect(result.corpus.coverage.isCompleteUniverse).toBe(false);
      expect(result.corpus.coverage.boundedSampleReason).toMatch(/25/);
    });
    it(`${domain.domain}: tampered hash and unknown rights cannot open`, () => {
      const original = lock(domain.domain);
      const target = original.artifacts.find((a) =>
        a.artifactId.endsWith("-data"),
      )!;
      expect(() =>
        domain.compileProduction({
          ...original,
          artifacts: original.artifacts.map((a) =>
            a === target
              ? { ...a, bytes: { ...a.bytes, sha256: "0".repeat(64) } }
              : a,
          ),
        }),
      ).toThrow(/hashes to/);
      expect(() =>
        domain.compileProduction({
          ...original,
          artifacts: original.artifacts.map((a) =>
            a === target
              ? {
                  ...a,
                  rights: {
                    status: "UNKNOWN",
                    declaredLicense: null,
                    attributionRequired: "UNKNOWN",
                  },
                }
              : a,
          ),
        }),
      ).toThrow(/UNKNOWN rights/);
    });
  }
  it("publisher data counts and exact official identity examples", () => {
    const f = finance.compileProduction(lock("government-finances"));
    const e = employment.compileProduction(lock("public-employment"));
    expect(f.records.length).toBe(886);
    expect(e.records.length).toBe(298);
    const al = f.records.find(
      (r) =>
        r.publisher?.publisherId === "010000226085" && r.itemCode === "19U",
    )!;
    expect(al.censusGovId).toBe("01000000000000");
    expect(al.amount).toMatchObject({
      state: "KNOWN",
      value: 10894051,
      asOf: "2024-09-30",
    });
    expect(al.surveyYear).toBe(2024);
    expect(al.fiscalYearLabel.state).toBe("UNKNOWN");
    const ae = e.records.find(
      (r) => r.censusGovId === "01000000000000" && r.functionCode === "000",
    )!;
    expect(ae.fullTimeEmployees).toMatchObject({
      state: "KNOWN",
      value: 86787,
    });
    expect(ae.publisher?.pid6).toBe("226085");
    expect(ae.publisher?.dataFlags).toEqual(["T", "T", "R", "R"]);
    expect(ae.fullTimeEquivalent.state).toBe("UNKNOWN");
    expect(ae.fullTimePayroll).toMatchObject({
      state: "KNOWN",
      asOf: "2025-03-31",
    });
    expect(ae.fullTimeEmployees).toMatchObject({
      state: "KNOWN",
      asOf: "2025-03-12",
    });
    expect(ae.publisher?.payrollPeriod).toEqual({
      start: "2025-03-01",
      end: "2025-03-31",
    });
  });
});

describe("publisher layout adversaries", () => {
  for (const [name, parse, data] of [
    [
      "finance values",
      parseFinancePublisher,
      bytes("government-finances", "data.txt"),
    ],
    [
      "finance directory",
      parseFinanceIdentities,
      bytes("government-finances", "identity.txt"),
    ],
    [
      "employment values",
      parseEmploymentPublisher,
      bytes("public-employment", "data.txt"),
    ],
    [
      "employment directory",
      parseEmploymentIdentities,
      bytes("public-employment", "identity.txt"),
    ],
  ] as const) {
    it(`${name}: missing column, extra column, duplicate row and invalid byte fail`, () => {
      const first = data.toString("ascii").split(/\r?\n/)[0]!;
      expect(() => parse(Buffer.from(first.slice(1)))).toThrow();
      expect(() => parse(Buffer.from(first + "XX"))).toThrow();
      expect(() => parse(Buffer.from(first + "\n" + first + "\n"))).toThrow(
        /Duplicate/,
      );
      expect(() =>
        parse(Buffer.concat([Buffer.from([255]), data.subarray(1)])),
      ).toThrow(/ASCII/);
    });
  }
  it("finance only permits documented optional trailing padding", () => {
    const first = bytes("government-finances", "data.txt")
      .toString()
      .split(/\r?\n/)[0]!;
    expect(parseFinancePublisher(Buffer.from(first + " \n"))).toEqual(
      parseFinancePublisher(Buffer.from(first + "\n")),
    );
    expect(() => parseFinancePublisher(Buffer.from(first + "S\n"))).toThrow();
    expect(() =>
      parseFinancePublisher(
        Buffer.from(first.slice(0, 27) + "2023" + first.slice(31)),
      ),
    ).toThrow(/year/);
  });
  it("employment reserved bytes, function and undocumented suppression flag fail closed", () => {
    const first = bytes("public-employment", "data.txt")
      .toString()
      .split(/\r?\n/)[0]!;
    expect(() =>
      parseEmploymentPublisher(
        Buffer.from(first.slice(0, 14) + "X" + first.slice(15)),
      ),
    ).toThrow(/reserved/);
    expect(() =>
      parseEmploymentPublisher(
        Buffer.from(first.slice(0, 17) + "999" + first.slice(20)),
      ),
    ).toThrow(/function/);
    expect(() =>
      parseEmploymentPublisher(
        Buffer.from(first.slice(0, 31) + "S" + first.slice(32)),
      ),
    ).toThrow(/Undocumented/);
  });
  it("finance S is alternative source; M, N, blank and numeric zero remain distinct", () => {
    const row = finRows()[0]!;
    for (const flag of ["R", "I", "S", "A"])
      expect(
        financePublisherAmount(
          { ...row, flag, rawAmount: "0" },
          "2024-09-30",
          evidence,
        ),
      ).toMatchObject({ state: "KNOWN", value: 0 });
    expect(
      financePublisherAmount(
        { ...row, flag: "M", rawAmount: "0" },
        "2024-09-30",
        evidence,
      ).state,
    ).toBe("UNKNOWN");
    expect(
      financePublisherAmount(
        { ...row, flag: "N", rawAmount: "0" },
        "2024-09-30",
        evidence,
      ).state,
    ).toBe("NOT_APPLICABLE");
    expect(
      financePublisherAmount(
        { ...row, flag: "R", rawAmount: "" },
        "2024-09-30",
        evidence,
      ).state,
    ).toBe("UNKNOWN");
    expect(() =>
      financePublisherAmount({ ...row, flag: "D" }, "2024-09-30", evidence),
    ).toThrow();
    expect(() => financePublisherCategory("ZZZ")).toThrow(/codebook/);
  });
  it("employment blank measure is unknown and a reported zero is known", () => {
    const row = empRows()[0]!;
    const changed = {
      ...row,
      measures: row.measures.map((m, i) => ({
        ...m,
        raw: i === 0 ? "" : i === 1 ? "0" : m.raw,
      })),
    };
    const record = adaptEmploymentPublisher(
      [changed],
      empIds(),
      "data",
      "identity",
      "codebook",
    )[0]!;
    expect(record.fullTimeEmployees.state).toBe("UNKNOWN");
    expect(record.fullTimePayroll).toMatchObject({ state: "KNOWN", value: 0 });
    expect(record.fullTimeEquivalent.state).toBe("UNKNOWN");
  });
  it("official identifier joins refuse absent or contradictory pairs, never names", () => {
    expect(() =>
      adaptEmploymentPublisher(
        empRows(),
        new Map(),
        "data",
        "identity",
        "codebook",
      ),
    ).toThrow(/identifier join/);
    expect(() =>
      adaptEmploymentPublisher(
        [{ ...empRows()[0]!, pid6: "999999" }],
        empIds(),
        "data",
        "identity",
        "codebook",
      ),
    ).toThrow(/identifier join/);
    expect(() =>
      adaptFinancePublisher(finRows(), finIds(), new Map(), "data", "identity"),
    ).toThrow(/SRC-GOV2/);
    const ids = new Map(finIds());
    ids.delete(finRows()[0]!.publisherId);
    expect(() =>
      adaptFinancePublisher(finRows(), ids, crosswalk(), "data", "identity"),
    ).toThrow(/identity/);
  });
  it("state fiscal year and local July–June rule are independently grounded", () => {
    const state = finIds().get("010000226085")!;
    expect(financePublisherEnding(state)).toBe("2024-09-30");
    const local = { ...state, publisherId: "011001100001" };
    expect(financePublisherEnding(local)).toBe("2023-09-30");
    expect(financePublisherEnding({ ...local, endingMonthDay: "0630" })).toBe(
      "2024-06-30",
    );
    expect(() =>
      financePublisherEnding({ ...local, endingMonthDay: "0230" }),
    ).toThrow();
  });
  for (const [domain, year, cut, dataMember, idMember] of [
    ["government-finances", "2024", cutFinance, FIN_DATA, FIN_ID],
    ["public-employment", "2025", cutEmployment, EMP_DATA, EMP_ID],
  ] as const) {
    const cache = resolve(
      root,
      `.source-cache/${domain}/${year}-individual-units.zip`,
    );
    it.skipIf(!existsSync(cache))(
      `${domain}: QA bytes recut from full locked archive`,
      () => {
        const archive = readFileSync(cache),
          parent = lock(domain).artifacts[0]!;
        expect(sha256Hex(archive)).toBe(parent.bytes.sha256);
        expect(cut(archive, dataMember)).toEqual(bytes(domain, "data.txt"));
        expect(cut(archive, idMember)).toEqual(bytes(domain, "identity.txt"));
        expect(sha256Hex(readZipMember(archive, dataMember))).toBe(
          parent.container?.memberSha256,
        );
      },
    );
  }
});

/** A one-member stored ZIP for byte-preservation adversaries. */
function storedZip(name: string, content: Buffer): Buffer {
  const n = Buffer.from(name);
  let crc = ~0;
  for (const byte of content) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  crc = ~crc >>> 0;
  const local = Buffer.alloc(30),
    central = Buffer.alloc(46),
    end = Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(content.length, 18);
  local.writeUInt32LE(content.length, 22);
  local.writeUInt16LE(n.length, 26);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(content.length, 20);
  central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(n.length, 28);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + n.length, 12);
  end.writeUInt32LE(local.length + n.length + content.length, 16);
  return Buffer.concat([local, n, content, central, n, end]);
}

for (const [domain, cut, member, parse, nameOffset] of [
  ["government-finances", cutFinance, FIN_ID, parseFinanceIdentities, 12],
  ["public-employment", cutEmployment, EMP_ID, parseEmploymentIdentities, 14],
] as const) {
  it(`${domain}: QA selection preserves non-ASCII drift for parser rejection`, () => {
    const row = Buffer.from(
      bytes(domain, "identity.txt").toString("latin1").split(/\r?\n/)[0]! +
        "\n",
      "latin1",
    );
    row[nameOffset] = 0xe9;
    const selected = cut(storedZip(member, row), member);
    expect(selected).toEqual(row);
    expect(() => parse(selected)).toThrow(/ASCII/);
  });
}
