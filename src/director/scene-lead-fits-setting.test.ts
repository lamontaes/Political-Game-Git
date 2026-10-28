/**
 * A scene's opening line fits the place it is set (owner, Oct 27, 6:10 PM
 * Eastern, Berry, Kentucky: "Elizabeth Page has been waiting for you to get
 * home" played on a Main Street storefront). The circumstance producer stages
 * news met on the street or at work as the news-arrives type, whose leads
 * were written for home. A lead written for one kind of place carries that
 * place on its use, and the director says it only in a scene set there.
 */
import { describe, expect, it } from "vitest";
import circumstances from "./data/circumstances.json" with { type: "json" };
import { SCENE_WORDS, wordSceneLine } from "../english/scene-words";
import type { PersonId } from "../core2/types";

const ROWS = (
  circumstances as unknown as {
    rows: { id: string; place: string; typeKey: string }[];
  }
).rows;

const leadsFor = (typeKey: string) =>
  SCENE_WORDS.leads.find((row) => row.typeKey === typeKey)?.variants ?? [];

describe("a scene's lead fits its setting", () => {
  it("every circumstance's place has a lead that fits it, and none written for elsewhere", () => {
    for (const row of ROWS) {
      const leads = leadsFor(row.typeKey);
      if (!leads.length) continue;
      const fit = leads.filter(
        (lead) => !lead.settings || lead.settings.includes(row.place),
      );
      expect(
        fit.length,
        `${row.id}: no lead fits ${row.place}`,
      ).toBeGreaterThan(0);
    }
  });

  it("news met on the street is never told as waiting for you to get home", () => {
    const home = leadsFor("news-arrives").filter((lead) =>
      lead.settings?.includes("home"),
    );
    expect(home.length).toBeGreaterThan(0);
    const homeTexts = new Set(
      home.map((lead) => lead.text.replace("{{other}}", "Elizabeth Page")),
    );
    const said = (setting: string) =>
      Array.from(
        { length: 200 },
        (_, at) =>
          wordSceneLine({
            seed: `lead-fits:${at}`,
            move: { part: "lead", typeKey: "news-arrives", setting },
            viewerId: "person:player" as PersonId,
            facts: {
              other: {
                text: "Elizabeth Page",
                sourceRecordIds: ["person:page"],
              },
            },
            stage: () => "other",
            momentKey: `lead-fits:${setting}:${at}`,
            fallbackSourceId: "person:page",
          })?.text,
      ).filter((text): text is string => !!text);
    const street = said("public");
    expect(street.length).toBeGreaterThan(0);
    for (const text of street) expect(homeTexts.has(text), text).toBe(false);
    // At home the same lines stay in the bank.
    expect(said("home").some((text) => homeTexts.has(text))).toBe(true);
  });
});
