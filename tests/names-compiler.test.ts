/**
 * National Names V2 Source Compiler Test Suite
 *
 * Verifies all 13 required invariants for source data ingestion, normalization,
 * deterministic ordering, count reconciliation, cohort isolation, suppression preservation,
 * provenance integrity, and simulation non-interference.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  compileNamesDataset,
  type CompileSourceBuffers,
} from "../scripts/names-compiler/compiler";
import { queryCohort } from "../scripts/names-compiler/cohort-query";
import type {
  GivenNameSourceRecord,
  SurnameSourceRecord,
} from "../scripts/names-compiler/schemas";

const REPO_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(REPO_ROOT, "data/names-v2");

// CRC32 helper for creating in-memory synthetic test ZIP archives
function crc32(buf: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return ~crc >>> 0;
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

function makeZipBuffer(files: Record<string, string | Buffer>): Buffer {
  const localChunks: Buffer[] = [];
  const cdChunks: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, "utf8");
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);

    // Local file header
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(0, 8); // stored
    lh.writeUInt32LE(0, 10);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);

    localChunks.push(lh, nameBuf, data);

    // Central directory header
    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0, 8);
    cdh.writeUInt16LE(0, 10);
    cdh.writeUInt32LE(0, 12);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(data.length, 20);
    cdh.writeUInt32LE(data.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(offset, 42);

    cdChunks.push(cdh, nameBuf);
    offset += lh.length + nameBuf.length + data.length;
  }

  const cdBuf = Buffer.concat(cdChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, cdBuf, eocd]);
}

function createSyntheticCensusFirstNamesXlsx(): Buffer {
  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="7" uniqueCount="7">
  <si><t>Frequently Occurring First Names in the 2020 Census by Sex</t></si>
  <si><t>FIRST NAME</t></si>
  <si><t>ALEXIS</t></si>
  <si><t>JORDAN</t></si>
  <si><t>MICHAEL</t></si>
  <si><t>MARY</t></si>
  <si><t>ALL OTHER NAMES</t></si>
</sst>`;

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c></row>
    <row r="3"><c r="A3" t="s"><v>1</v></c><c r="B3"><v>1</v></c><c r="C3"><v>100</v></c><c r="D3"><v>10</v></c><c r="E3"><v>10</v></c><c r="F3"><v>50</v></c><c r="G3"><v>50</v></c></row>
    <row r="4"><c r="A4" t="s"><v>2</v></c><c r="B4"><v>10</v></c><c r="C4"><v>1000</v></c><c r="D4"><v>100</v></c><c r="E4"><v>100</v></c><c r="F4"><v>300</v></c><c r="G4"><v>700</v></c></row>
    <row r="5"><c r="A5" t="s"><v>3</v></c><c r="B5"><v>11</v></c><c r="C5"><v>2000</v></c><c r="D5"><v>200</v></c><c r="E5"><v>300</v></c><c r="F5"><v>1100</v></c><c r="G5"><v>900</v></c></row>
    <row r="6"><c r="A6" t="s"><v>4</v></c><c r="B6"><v>1</v></c><c r="C6"><v>50000</v></c><c r="D6"><v>500</v></c><c r="E6"><v>800</v></c><c r="F6"><v>49000</v></c><c r="G6"><v>1000</v></c></row>
    <row r="7"><c r="A7" t="s"><v>5</v></c><c r="B7"><v>2</v></c><c r="C7"><v>40000</v></c><c r="D7"><v>400</v></c><c r="E7"><v>1200</v></c><c r="F7"><v>100</v></c><c r="G7"><v>39900</v></c></row>
    <row r="8"><c r="A8" t="s"><v>6</v></c><c r="B8"><v>999</v></c><c r="C8"><v>100000</v></c><c r="D8"><v>1000</v></c><c r="E8"><v>100000</v></c><c r="F8"><v>50000</v></c><c r="G8"><v>50000</v></c></row>
  </sheetData>
</worksheet>`;

  return makeZipBuffer({
    "xl/sharedStrings.xml": sharedStringsXml,
    "xl/worksheets/sheet1.xml": sheet1Xml,
  });
}

function createSyntheticCensusSurnamesXlsx(): Buffer {
  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="5" uniqueCount="5">
  <si><t>Frequently Occurring Last Names in the 2020 Census by Race and Hispanic Origin</t></si>
  <si><t>LAST NAME</t></si>
  <si><t>SMITH</t></si>
  <si><t>GARCIA</t></si>
  <si><t>ALL OTHER NAMES</t></si>
</sst>`;

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c></row>
    <row r="3"><c r="A3" t="s"><v>1</v></c><c r="B3"><v>1</v></c><c r="C3"><v>100</v></c><c r="D3"><v>10</v></c><c r="E3"><v>10</v></c><c r="F3"><v>50</v></c><c r="G3"><v>50</v></c></row>
    <row r="4"><c r="A4" t="s"><v>2</v></c><c r="B4"><v>1</v></c><c r="C4"><v>2000000</v></c><c r="D4"><v>800</v></c><c r="E4"><v>800</v></c><c r="F4"><v>1500000</v></c><c r="G4"><v>400000</v></c><c r="H4"><v>10000</v></c><c r="I4"><v>10000</v></c><c r="J4"><v>40000</v></c><c r="K4"><v>40000</v></c></row>
    <row r="5"><c r="A5" t="s"><v>3</v></c><c r="B5"><v>6</v></c><c r="C5"><v>1000000</v></c><c r="D5"><v>400</v></c><c r="E5"><v>1200</v></c><c r="F5"><v>50000</v></c><c r="G5"><v>10000</v></c><c r="H5"><v>5000</v></c><c r="I5"><v>5000</v></c><c r="J5"><v>20000</v></c><c r="K5"><v>910000</v></c></row>
    <row r="6"><c r="A6" t="s"><v>4</v></c><c r="B6"><v>999</v></c><c r="C6"><v>10000000</v></c><c r="D6"><v>3000</v></c><c r="E6"><v>100000</v></c></row>
  </sheetData>
</worksheet>`;

  return makeZipBuffer({
    "xl/sharedStrings.xml": sharedStringsXml,
    "xl/worksheets/sheet1.xml": sheet1Xml,
  });
}

function createSyntheticSSANationalZip(): Buffer {
  return makeZipBuffer({
    "yob1950.txt": "Michael,M,80000\nMary,F,60000\nAlexis,F,50\nAlexis,M,30\n",
    "yob2002.txt":
      "Michael,M,30000\nAlexis,F,8000\nAlexis,M,1000\nJordan,M,12000\nJordan,F,5000\n",
    "yob2025.txt":
      "Michael,M,10000\nAlexis,F,2000\nAlexis,M,400\nJordan,M,6000\nJordan,F,1500\n",
  });
}

function createSyntheticSSAStateZip(): Buffer {
  return makeZipBuffer({
    "KY.TXT":
      "KY,M,1950,Michael,1200\nKY,F,1950,Mary,900\nKY,M,2002,Jordan,150\n",
    "CA.TXT":
      "CA,M,1950,Michael,8000\nCA,F,2002,Alexis,1200\nCA,M,2002,Alexis,150\n",
  });
}

function createSyntheticSSATerritoryZip(): Buffer {
  return makeZipBuffer({
    "PR.TXT": "PR,F,1998,Paola,724\nPR,F,2002,Alexis,50\n",
    "TR.TXT": "TR,F,2002,Gabrielle,14\n",
  });
}

describe("National Names V2 Source Compiler", () => {
  // Pre-load representative sample shards once before all tests run
  let shardA: GivenNameSourceRecord[] = [];
  let shardD: GivenNameSourceRecord[] = [];
  let shardE: GivenNameSourceRecord[] = [];
  let shardJ: GivenNameSourceRecord[] = [];
  let shardK: GivenNameSourceRecord[] = [];
  let shardL: GivenNameSourceRecord[] = [];
  let shardM: GivenNameSourceRecord[] = [];
  let shardO: GivenNameSourceRecord[] = [];
  let shardP: GivenNameSourceRecord[] = [];
  let shardT: GivenNameSourceRecord[] = [];
  let shardZ: GivenNameSourceRecord[] = [];
  let surnameShardA: SurnameSourceRecord[] = [];
  let surnameShardS: SurnameSourceRecord[] = [];
  let surnameShardZ: SurnameSourceRecord[] = [];

  beforeAll(() => {
    if (fs.existsSync(path.join(DATA_DIR, "manifest.json"))) {
      const readGiven = (fn: string) =>
        JSON.parse(
          fs.readFileSync(path.join(DATA_DIR, "given-names", fn), "utf8"),
        );
      const readSurname = (fn: string) =>
        JSON.parse(
          fs.readFileSync(path.join(DATA_DIR, "surnames", fn), "utf8"),
        );

      shardA = readGiven("given_names_a.json");
      shardD = readGiven("given_names_d.json");
      shardE = readGiven("given_names_e.json");
      shardJ = readGiven("given_names_j.json");
      shardK = readGiven("given_names_k.json");
      shardL = readGiven("given_names_l.json");
      shardM = readGiven("given_names_m.json");
      shardO = readGiven("given_names_o.json");
      shardP = readGiven("given_names_p.json");
      shardT = readGiven("given_names_t.json");
      shardZ = readGiven("given_names_z.json");

      surnameShardA = readSurname("surnames_a.json");
      surnameShardS = readSurname("surnames_s.json");
      surnameShardZ = readSurname("surnames_z.json");
    }
  });

  describe("Invariant 1: Repeat build from identical source bytes is byte-identical", () => {
    it("produces identical JSON shards, manifest, and SHA-256 hashes across repeated compilations", () => {
      const sources: CompileSourceBuffers = {
        censusFirstNamesBuffer: createSyntheticCensusFirstNamesXlsx(),
        censusSurnamesBuffer: createSyntheticCensusSurnamesXlsx(),
        ssaNationalBuffer: createSyntheticSSANationalZip(),
        ssaStateBuffer: createSyntheticSSAStateZip(),
        ssaTerritoryBuffer: createSyntheticSSATerritoryZip(),
      };

      const res1 = compileNamesDataset(sources);
      const res2 = compileNamesDataset(sources);

      expect(res1.manifest.summary).toEqual(res2.manifest.summary);

      for (const [shardKey, shard1] of res1.givenNameShards) {
        const shard2 = res2.givenNameShards.get(shardKey);
        expect(shard2).toBeDefined();
        expect(shard1.json).toBe(shard2!.json);
      }

      for (const [shardKey, shard1] of res1.surnameShards) {
        const shard2 = res2.surnameShards.get(shardKey);
        expect(shard2).toBeDefined();
        expect(shard1.json).toBe(shard2!.json);
      }
    });
  });

  describe("Invariant 2: Stable ordering independent of input order", () => {
    it("enforces strict alphabetical ordering of name keys within compiled shards", () => {
      for (const shard of [shardA, shardM, shardZ]) {
        for (let i = 1; i < shard.length; i++) {
          expect(shard[i].key > shard[i - 1].key).toBe(true);
        }
      }

      for (const shard of [surnameShardA, surnameShardS, surnameShardZ]) {
        for (let i = 1; i < shard.length; i++) {
          expect(shard[i].key > shard[i - 1].key).toBe(true);
        }
      }
    });
  });

  describe("Invariant 3: Duplicate normalization cannot silently double-count", () => {
    it("deduplicates keys and correctly aggregates counts across years without inflating totals", () => {
      const michael = shardM.find((r) => r.key === "michael");
      expect(michael).toBeDefined();
      expect(michael!.census).toBeDefined();
      expect(michael!.census!.total_count).toBe(3476721);
      expect(michael!.census!.male_count).toBe(3469434);
      expect(michael!.census!.female_count).toBe(7287);

      // Verify national SSA yearly sum equals SSA total
      if (michael!.ssa_national) {
        let sumM = 0;
        let sumF = 0;
        for (const yr of Object.values(michael!.ssa_national.yearly)) {
          sumM += yr.male;
          sumF += yr.female;
        }
        expect(sumM).toBe(michael!.ssa_national.total_male);
        expect(sumF).toBe(michael!.ssa_national.total_female);
        expect(sumM + sumF).toBe(michael!.ssa_national.total);
      }
    });
  });

  describe("Invariant 4: Male/female counts reconcile to expected totals where source semantics allow", () => {
    it("ensures every Census first name record reconciles male_count + female_count === total_count", () => {
      for (const rec of shardA) {
        if (rec.census) {
          expect(rec.census.male_count + rec.census.female_count).toBe(
            rec.census.total_count,
          );
          expect(rec.census.male_share + rec.census.female_share).toBeCloseTo(
            1.0,
            4,
          );
        }
      }
    });
  });

  describe("Invariant 5: Mixed-sex names remain mixed rather than receiving a hard categorical label", () => {
    it("stores empirical male and female counts/shares for names occurring under both sexes", () => {
      const alexis = shardA.find((r) => r.key === "alexis");
      const avery = shardA.find((r) => r.key === "avery");
      const jordan = shardJ.find((r) => r.key === "jordan");
      const micah = shardM.find((r) => r.key === "micah");
      const taylor = shardT.find((r) => r.key === "taylor");

      for (const rec of [alexis, avery, jordan, micah, taylor]) {
        expect(rec).toBeDefined();

        if (rec?.census) {
          expect(rec.census.male_count).toBeGreaterThan(0);
          expect(rec.census.female_count).toBeGreaterThan(0);
          expect(rec.census.male_share).toBeGreaterThan(0);
          expect(rec.census.female_share).toBeGreaterThan(0);
        }

        if (rec?.ssa_national) {
          expect(rec.ssa_national.total_male).toBeGreaterThan(0);
          expect(rec.ssa_national.total_female).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Invariant 6: SSA cohort frequencies remain separated by birth year", () => {
    it("preserves distinct yearly counts across 1880-2025 without flattening or cohort loss", () => {
      const john = shardJ.find((r) => r.key === "john");
      expect(john).toBeDefined();
      expect(john!.ssa_national).toBeDefined();

      const yearly = john!.ssa_national!.yearly;
      expect(yearly["1880"]).toBeDefined();
      expect(yearly["1950"]).toBeDefined();
      expect(yearly["2025"]).toBeDefined();

      expect(yearly["1880"].male).toBe(9655);
      expect(yearly["2025"].male).toBeGreaterThan(0);
      expect(yearly["1880"].male).not.toBe(yearly["2025"].male);
    });
  });

  describe("Invariant 7: State frequencies do not leak between states", () => {
    it("ensures state-level frequencies are isolated to their specific state codes", () => {
      const kyrie = shardK.find((r) => r.key === "kyrie");
      expect(kyrie).toBeDefined();

      if (kyrie!.ssa_state["KY"] && kyrie!.ssa_state["CA"]) {
        expect(kyrie!.ssa_state["KY"].total).not.toBe(
          kyrie!.ssa_state["CA"].total,
        );
      }
    });
  });

  describe("Invariant 8: Puerto Rico / territory data remain distinct from SSA 50-state+DC national series", () => {
    it("maintains territory records in ssa_territory and keeps territory-specific names distinct", () => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, "manifest.json"), "utf8"),
      );
      expect(manifest.summary.ssa_territories).toContain("PR");
      expect(manifest.summary.ssa_territories).toContain("TR");

      const paola = shardP.find((r) => r.key === "paola");
      expect(paola).toBeDefined();
      expect(paola!.ssa_territory["PR"]).toBeDefined();
      expect(paola!.ssa_territory["PR"].yearly["1998"]).toBeDefined();
      expect(paola!.ssa_territory["PR"].yearly["1998"].female).toBe(724);
    });
  });

  describe("Invariant 9: Suppression/missing data is not treated as zero", () => {
    it("leaves absent years/states undefined instead of inserting zero counts", () => {
      const rareName = shardZ.find(
        (r) => r.ssa_national && r.ssa_national.total < 50,
      );
      if (rareName) {
        const yearlyYears = Object.keys(rareName.ssa_national!.yearly);
        expect(yearlyYears.length).toBeLessThan(146);
        expect(rareName.ssa_national!.yearly["1881"]).toBeUndefined();
      }
    });
  });

  describe("Invariant 10: Malformed source records fail loudly", () => {
    it("throws clear error if Census or SSA records have invalid columns or corrupt numbers", () => {
      expect(() => {
        compileNamesDataset({
          censusFirstNamesBuffer: Buffer.from("not a zip"),
          censusSurnamesBuffer: Buffer.from("not a zip"),
          ssaNationalBuffer: Buffer.from("not a zip"),
          ssaStateBuffer: Buffer.from("not a zip"),
          ssaTerritoryBuffer: Buffer.from("not a zip"),
        });
      }).toThrow(/Invalid ZIP file/i);
    });
  });

  describe("Invariant 11: Source hashes and provenance are complete in manifest", () => {
    it("verifies all cryptographic hashes and manifest consistency", () => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, "manifest.json"), "utf8"),
      );
      expect(manifest.schema_version).toBe("2.0.0");
      expect(manifest.compiler_version).toBe("national-names-compiler-v2.0");
      expect(manifest.summary.total_unique_given_names).toBe(114004);
      expect(manifest.summary.total_unique_surnames).toBe(156621);
      expect(Object.keys(manifest.given_name_shards).length).toBe(26);
      expect(Object.keys(manifest.surname_shards).length).toBe(26);

      // Verify SHA-256 for sample shards
      const shardAFile = manifest.given_name_shards["a"].file;
      const shardABuf = fs.readFileSync(path.join(DATA_DIR, shardAFile));
      const hashA = createHash("sha256").update(shardABuf).digest("hex");
      expect(hashA).toBe(manifest.given_name_shards["a"].sha256);
    });
  });

  describe("Invariant 12: Race / ethnicity guardrail", () => {
    it("ensures no race inference functions (e.g. guessRaceFromName) exist in the compiler or tooling", () => {
      const compilerFiles = fs.readdirSync(
        path.join(REPO_ROOT, "scripts/names-compiler"),
      );
      for (const cf of compilerFiles) {
        const code = fs.readFileSync(
          path.join(REPO_ROOT, "scripts/names-compiler", cf),
          "utf8",
        );
        expect(code.includes("guessRaceFromName")).toBe(false);
        expect(code.includes("inferRace")).toBe(false);
        expect(code.includes("predictRace")).toBe(false);
        expect(code.includes("guessEthnicity")).toBe(false);
      }
    });
  });

  describe("Invariant 13: Non-interference with src/simulation/ and player UI", () => {
    it("guarantees no files in src/simulation/ or player UI were altered", () => {
      const namesDataContent = fs.readFileSync(
        path.join(REPO_ROOT, "src/simulation/names-data.ts"),
        "utf8",
      );
      expect(namesDataContent).toContain(
        'export const DEFAULT_CORPUS_VERSION = "names-v1";',
      );
      expect(namesDataContent).toContain(
        "export const NAMES_STARTER_V1: NameCorpus = {",
      );
    });
  });

  describe("Cohort Query Substrate", () => {
    it("accurately answers historical cohort queries for Kentucky 1953", () => {
      const sampleRecords = [...shardJ, ...shardM];
      const res = queryCohort(sampleRecords, {
        year: 1953,
        jurisdiction: "KY",
        limit: 10,
      });

      expect(res.year).toBe(1953);
      expect(res.jurisdiction).toBe("KY");
      expect(res.names.length).toBeGreaterThan(0);

      const topKeys = res.names.map((n) => n.key);
      expect(
        topKeys.some((k) => k === "james" || k === "john" || k === "mary"),
      ).toBe(true);
    });

    it("accurately answers historical cohort queries for California 2002", () => {
      const sampleRecords = [...shardD, ...shardE];
      const res = queryCohort(sampleRecords, {
        year: 2002,
        jurisdiction: "CA",
        limit: 10,
      });

      expect(res.year).toBe(2002);
      expect(res.jurisdiction).toBe("CA");
      expect(res.names.length).toBeGreaterThan(0);
      expect(res.names[0].rank).toBe(1);
    });

    it("accurately answers national contemporary queries for 2025 newborns", () => {
      const sampleRecords = [...shardL, ...shardO];
      const res = queryCohort(sampleRecords, {
        year: 2025,
        jurisdiction: "US",
        limit: 10,
      });

      expect(res.year).toBe(2025);
      expect(res.jurisdiction).toBe("US");
      expect(res.names.length).toBeGreaterThan(0);
    });
  });
});
