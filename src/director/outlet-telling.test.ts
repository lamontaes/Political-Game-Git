import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { outletsHere } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import { outletFacts } from "./conversation";

it("an outlet is said as its record has it, with its medium and whether it takes 'the'", () => {
  const place = drawPlace("pl5", "police-log");
  setBookkeeping(false);
  const core = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core;
  const api = coreAPI(core);
  const said = outletsHere(api)
    .filter((o) => o.tier !== "national")
    .map((o) => {
      const org = core.organizations.get(o.organizationId as never)!;
      return {
        kind: o.kind,
        name: org.name,
        facts: outletFacts(core, org, ["test"]),
      };
    });
  const where = `${place.name} (${place.key}), seed pl5: ${said.map((s) => `${s.kind}=${s.name}`).join(", ")}`;
  for (const s of said) expect(s.facts.outlet?.text, where).toBe(s.name);
  const radio = said.filter((s) => s.kind === "radio");
  expect(radio.length, where).toBeGreaterThan(0);
  for (const s of radio) {
    expect(s.name, where).toMatch(/^[KW][A-Z]{3}$/);
    expect(Object.keys(s.facts).sort(), where).toEqual([
      "outlet",
      "outlet-radio",
    ]);
  }
  for (const s of said.filter((s) => s.kind === "television"))
    expect(Object.keys(s.facts).sort(), where).toEqual([
      "outlet",
      "outlet-television",
    ]);
  const papers = said.filter((s) => s.kind === "newspaper");
  expect(papers.length, where).toBeGreaterThan(0);
  for (const s of papers)
    expect(Object.keys(s.facts).sort(), where).toEqual([
      "outlet",
      "outlet-paper",
      "outlet-the",
    ]);
}, 120_000);
