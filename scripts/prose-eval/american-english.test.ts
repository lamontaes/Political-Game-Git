import { describe, expect, it } from "vitest";
import {
  authoredDataFields,
  checkAmericanEnglish,
  type CopyField,
} from "./american-english";

const keys = new Set([
  "label",
  "description",
  "heading",
  "text",
  "clausePhrase",
  "appliesToLabel",
  "programmeLabel",
]);
describe("authored American English across data surfaces", () => {
  it.each([...keys])(
    "catches visible programme copy in %s, then accepts its repair",
    (key) => {
      const record = {
        mechanism: "programme-authorization",
        [key]: "Community programme",
      };
      expect(
        checkAmericanEnglish(authoredDataFields(record, keys)),
      ).toHaveLength(1);
      expect(
        checkAmericanEnglish(
          authoredDataFields({ ...record, [key]: "Community program" }, keys),
        ),
      ).toEqual([]);
    },
  );
  it("preserves legacy identifiers and raw records through explicit provenance", () => {
    const fields: CopyField[] = [
      "identifier",
      "quotation",
      "official-name",
      "source-example",
      "historical",
    ].map((provenance) => ({
      path: provenance,
      text: "programme-authorization / programmeLabel / Programme",
      provenance: provenance as CopyField["provenance"],
      reason: "Fixture source / stable save token; preserve verbatim",
    }));
    const before = JSON.stringify(fields);
    expect(checkAmericanEnglish(fields)).toEqual([]);
    expect(JSON.stringify(fields)).toBe(before);
    expect(
      checkAmericanEnglish([{ ...fields[0]!, reason: undefined }]),
    ).toHaveLength(1);
  });
  it("matches words, without banning legitimate councils or ministerial actions", () => {
    expect(
      checkAmericanEnglish([
        {
          path: "copy",
          text: "The council reviews a ministerial action by the administration after the aftermath discussion.",
          provenance: "authored",
        },
      ]),
    ).toEqual([]);
    expect(
      authoredDataFields(
        {
          programmeLabel: "Program",
          mechanism: "programme-authorization",
          nested: [{ text: "Programs" }],
        },
        keys,
      ),
    ).toHaveLength(2);
  });
});

it("keeps a reasoned administrative queue usage authored without suppressing other checks", () => {
  const field: CopyField = {
    path: "placeLabel",
    text: "the counties at the back of the queue",
    provenance: "authored",
  };
  expect(checkAmericanEnglish([field])).toHaveLength(1);
  const reviewed: CopyField = {
    ...field,
    authoredUsage: {
      kind: "administrative-processing-queue",
      reason:
        "The surrounding authored fields describe processing assistance applications, not a line of people.",
    },
  };
  expect(checkAmericanEnglish([reviewed])).toEqual([]);
  expect(reviewed.provenance).toBe("authored");
  expect(
    checkAmericanEnglish([
      { ...reviewed, text: "the programme application queue" },
    ]),
  ).toHaveLength(1);
  expect(
    checkAmericanEnglish([
      {
        ...reviewed,
        authoredUsage: { ...reviewed.authoredUsage!, reason: " " },
      },
    ]),
  ).toHaveLength(1);
  expect(
    checkAmericanEnglish([{ ...field, text: "She queued for the bus." }]),
  ).toHaveLength(1);
});
