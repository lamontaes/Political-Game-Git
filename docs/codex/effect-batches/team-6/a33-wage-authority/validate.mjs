import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { queryFiscalAuthority } from "../../../../../src/fiscal-authority/query.ts";
const root = new URL("./", import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root));
const json = (p) => JSON.parse(read(p));
const packet = json("dispositions.json");
const records = json("portable-records.json");
const artifacts = json("source-artifacts.json");
assert.equal(packet.rows.length, 57);
assert.equal(new Set(packet.rows.map((r) => r.place)).size, 57);
const captures = fs
  .readdirSync(root)
  .filter((p) => p.endsWith("manifest.json"))
  .flatMap((p) => {
    const data = json(p);
    return Array.isArray(data)
      ? data.map((a) => ({ ...a, path: `raw/${a.code}-broker.html` }))
      : data.captures;
  });
const withheld = json("publication-withheld.json").artifacts;
let verifiedCaptures = 0;
let withheldCaptures = 0;
for (const a of captures.filter((a) => a.sha256)) {
  const omission = withheld.find((w) => w.path === a.path);
  if (omission) {
    assert.equal(omission.sha256, a.sha256);
    assert.equal(omission.byteLength, a.byteLength);
    assert.ok(!fs.existsSync(new URL(a.path, root)));
    withheldCaptures++;
    continue;
  }
  assert.equal(
    createHash("sha256").update(read(a.path)).digest("hex"),
    a.sha256,
    a.path,
  );
  assert.equal(read(a.path).length, a.byteLength, a.path);
  verifiedCaptures++;
}
for (const row of packet.rows) {
  assert.equal(row.startingQuestionKey, null);
  assert.equal(row.startingConsequenceRowId, null);
  assert.equal(row.instrument, "INDIVIDUAL_INCOME_TAX");
  if (row.evidence) {
    const a = artifacts.artifacts.find(
      (a) => a.artifactId === row.evidence.artifactId,
    );
    assert.ok(a);
    assert.equal(a.sha256, row.evidence.sha256);
    assert.ok(
      read(row.evidence.textPath)
        .toString()
        .replace(/\s+/gu, " ")
        .includes(row.evidence.quote),
      row.place,
    );
  }
  if (!row.portableRecordId)
    assert.ok(!records.some((r) => r.stateUsps === row.place));
}
const states = [];
const day = (d, delta) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + delta * 86400000)
    .toISOString()
    .slice(0, 10);
for (const record of records) {
  const row = packet.rows.find((r) => r.portableRecordId === record.recordId);
  assert.ok(row);
  assert.equal(record.authorization, "AUTHORIZED");
  assert.equal(record.kind, "TAX_INSTRUMENT");
  assert.equal(record.source.enactedDate, null);
  assert.equal(record.source.artifactId, row.evidence.artifactId);
  assert.equal(
    artifacts.digestByArtifactId[record.source.artifactId],
    row.evidence.sha256,
  );
  for (const date of [record.effectiveFrom, record.effectiveThrough]) {
    assert.equal(
      queryFiscalAuthority(records, {
        stateUsps: record.stateUsps,
        level: record.level,
        asOfDate: date,
        instrument: record.instrument,
      }).state,
      record.uncertainty === null ? "IN_FORCE" : "UNESTABLISHED",
    );
  }
  for (const date of [
    day(record.effectiveFrom, -1),
    day(record.effectiveThrough, 1),
  ]) {
    const state = queryFiscalAuthority(records, {
      stateUsps: record.stateUsps,
      level: record.level,
      asOfDate: date,
      instrument: record.instrument,
    }).state;
    assert.notEqual(state, "IN_FORCE");
    states.push({ place: record.stateUsps, date, state });
  }
}
const receipt = {
  sourceHead: "ed100d549bd10457cbbf0b7608a855bd10e801a8",
  places: 57,
  portableRecords: records.length,
  quoteVerifiedDispositions: packet.rows.filter((r) => r.evidence).length,
  verifiedRawCaptures: verifiedCaptures,
  withheldRawCaptures: withheldCaptures,
  queryBoundaryAssertions: records.length * 4,
  counts: packet.counts,
  outsideIntervalResults: states,
  scope:
    "Pure existing fiscal-authority reader and local evidence validation only; no registry admission, production import, assessment activation or saved-world proof.",
};
fs.writeFileSync(
  new URL("validation-receipt.json", root),
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(
  JSON.stringify({ ...receipt, outsideIntervalResults: undefined }, null, 2),
);
