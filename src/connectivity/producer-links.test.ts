import fs from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import {
  PRODUCER_LINK_DIRECTORY,
  PRODUCER_LINK_VERSION,
  renderProducerLinks,
  validateProducerLinks,
  type MissingLink,
  type ProducerLinkEntry,
} from "./producer-links";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const exists = (repositoryPath: string) =>
  fs.existsSync(path.join(repositoryRoot, repositoryPath));

function link(over: Partial<MissingLink> = {}): MissingLink {
  return {
    reader: "A disaster's dead in the mortality count",
    readerOwner: "People and life",
    state: "open",
    detail: "Nothing reads the casualty field.",
    ...over,
  };
}

function entry(over: Partial<ProducerLinkEntry> = {}): ProducerLinkEntry {
  return {
    linkVersion: PRODUCER_LINK_VERSION,
    linkId: "a-disaster",
    title: "A disaster",
    producer: {
      at: "src/simulation/crisis/disasters.ts#declareDisaster",
      owner: "How the world changes",
      writes: "A disaster record with damage.",
      runsInPlay: true,
      runsDetail: "The weekly hazard draw.",
    },
    readers: [],
    missing: [link()],
    measuredAt: "main at 130dd113",
    recordedAt: "2026-09-23T01:30:00.000Z",
    ...over,
  };
}

const codes = (entries: readonly ProducerLinkEntry[]) =>
  validateProducerLinks(entries, exists).map((finding) => finding.code);

describe("a missing link", () => {
  it("is refused as closed without a test that proves it", () => {
    expect(codes([entry({ missing: [link({ state: "closed" })] })])).toContain(
      "closed-without-proof",
    );
    expect(
      codes([
        entry({
          missing: [
            link({ state: "closed", proofTest: "tests/no-such.test.ts" }),
          ],
        }),
      ]),
    ).toContain("proof-missing");
    expect(
      codes([
        entry({
          missing: [
            link({
              state: "closed",
              proofTest: "src/connectivity/producer-links.test.ts",
            }),
          ],
        }),
      ]),
    ).toEqual([]);
  });

  it("is refused as waiting on research unless the question is filed", () => {
    expect(
      codes([entry({ missing: [link({ state: "needs-research" })] })]),
    ).toContain("research-without-question");
    expect(
      codes([
        entry({
          missing: [
            link({
              state: "needs-research",
              researchQuestionId: "not-a-question",
            }),
          ],
        }),
      ]),
    ).toContain("question-missing");
  });

  it("names a real owning thread at both ends", () => {
    expect(
      codes([entry({ missing: [link({ readerOwner: "Somebody" as never })] })]),
    ).toContain("unknown-owner");
  });

  it("is listed under the thread that owns the reading end", () => {
    const document = renderProducerLinks([entry()], {
      generatedAt: "2026-09-23T01:30:00.000Z",
      head: "130dd113",
    });
    const owners = document.split("## Every producer")[0] ?? "";
    expect(owners.length).toBeGreaterThan(0);
    expect(owners).toContain("### People and life");
    expect(owners).toContain("A disaster's dead in the mortality count");
  });
});

describe("the links on this branch", () => {
  const directory = path.join(repositoryRoot, PRODUCER_LINK_DIRECTORY);
  const files = fs.readdirSync(directory).filter((f) => f.endsWith(".json"));
  const entries = files.map(
    (file) =>
      JSON.parse(
        fs.readFileSync(path.join(directory, file), "utf8"),
      ) as ProducerLinkEntry,
  );

  it("exist, so an empty directory cannot pass", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("are each named for their id and valid, with every closed link proved", () => {
    files.forEach((file, index) =>
      expect(file).toBe(`${entries[index]?.linkId}.json`),
    );
    expect(validateProducerLinks(entries, exists)).toEqual([]);
  });
});
