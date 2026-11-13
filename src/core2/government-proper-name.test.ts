import { expect, it } from "vitest";
import {
  governmentProperName,
  governmentWithoutProperName,
} from "./government-proper-name";
import { countyGovernmentUnit } from "./reference/government-units";

// A government's name is the listing's kind and the place record's own name,
// never the listing's capitals recased (Fable A on the crew line, Nov 13:
// "City of Mccall").
it("says a government by its place record's proper name", () => {
  expect(governmentProperName("CITY OF MCCALL", "place:1648790")).toBe(
    "City of McCall",
  );
  expect(governmentProperName("COUNTY OF DEKALB", "county:13089")).toBe(
    "DeKalb County",
  );
  // The listing drops the mark; the record keeps it.
  expect(governmentProperName("CITY OF O FALLON", "place:2954074")).toBe(
    "City of O'Fallon",
  );
  expect(governmentWithoutProperName("CITY OF MCCALL", "place:1648790")).toBe(
    false,
  );
  // Callers pass the listed unit's own id; a county reaches its record by it.
  const dekalb = countyGovernmentUnit("13089");
  expect(dekalb && governmentProperName(dekalb.name, dekalb.id)).toBe(
    "DeKalb County",
  );
});

it("keeps the listing's words where the place record holds another name", () => {
  // The record calls it Redwood City; the listing's words are said as they are.
  expect(governmentProperName("CITY OF REDWOOD", "place:0660102")).toBe(
    "City of Redwood",
  );
  expect(governmentWithoutProperName("CITY OF REDWOOD", "place:0660102")).toBe(
    true,
  );
  // A name never starts small, and an abbreviation keeps its capitals.
  expect(governmentProperName("CITY OF LA EXAMPLE", "")).toBe(
    "City of La Example",
  );
  expect(governmentProperName("CITY OF EXAMPLE DC", "")).toBe(
    "City of Example DC",
  );
  // A name already in ordinary capitals, with no place record, is kept.
  expect(governmentProperName("Idaho", "US-ID")).toBe("Idaho");
});
