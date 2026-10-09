import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import type { EntityId, IsoDate } from "../simulation";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../simulation/municipal-government";
import { governmentFormTerm } from "../presentation/government-form-english";
import { World39Standing } from "./World39News";

/*
 * News names who holds office as record values (menu reset): the title over
 * the holder, the employer only where the projection kept it, and the start
 * of the term only where the record has one. Markup proof.
 */

const holder = (
  title: string,
  institution: string | null,
  startedAt: string | null,
) => ({
  termId: `term:${title}` as EntityId,
  title,
  personId: "person:dana-ortiz" as EntityId,
  personName: "Dana Ortiz",
  institution,
  startedAt: startedAt as IsoDate | null,
});

function markup(officeholders: ReturnType<typeof holder>[]): string {
  return renderToStaticMarkup(
    <World39Standing
      officeholders={officeholders}
      standing={[]}
      onOpenPerson={() => {}}
    />,
  );
}

describe("News: who holds office", () => {
  it("shows the title over the holder and the date the term began", () => {
    const html = markup([
      holder("President of the United States", null, "2025-01-20"),
    ]);
    expect(html).toContain("<h5>President of the United States</h5>");
    expect(html).toContain("Dana Ortiz");
    expect(html).toMatch(/In office since <time[^>]*>January 20, 2025<\/time>/);
    // No sentence is written around the record.
    expect(html).not.toMatch(/serves as|has served as/);
  });

  it("names a distinct employer beside the holder", () => {
    expect(markup([holder("Clerk", "Hart County Library", null)])).toContain(
      "Dana Ortiz</button> · Hart County Library",
    );
  });

  it("does not name the same office twice", () => {
    const html = markup([
      holder(
        "President of the United States",
        "Presidency of the United States",
        "2025-01-20",
      ),
    ]);
    expect(html).not.toContain("Presidency of the United States");
  });

  it("says who serves without inventing a start date it does not have", () => {
    const html = markup([holder("Governor of Nevada", null, null)]);
    expect(html).toContain("Dana Ortiz");
    expect(html).not.toContain("In office since");
  });

  it("shows a town government's legislative body and form of government under its name", () => {
    const place = drawRandomPlace("news-standing-form-oct9", (candidate) => {
      const government = municipalGovernmentForLifePlace(candidate);
      return government !== null && governmentFormTerm(government) !== null;
    });
    const government = municipalGovernmentForLifePlace(place)!;
    const bodyName = primaryReading(government).bodyName;
    const formTerm = governmentFormTerm(government)!.text;
    const html = renderToStaticMarkup(
      <World39Standing
        officeholders={[]}
        standing={[
          {
            key: `government:${government.key}`,
            kind: "government",
            name: government.displayName,
            bodyName,
            formTerm,
            recordId: government.key,
          },
        ]}
        onOpenPerson={() => {}}
      />,
    );
    expect(html, place.displayName).toContain(
      `<h5>${government.displayName}</h5>${bodyName ? `<p>${bodyName}</p>` : ""}<p>${formTerm}</p>`,
    );
  });

  it("shows nothing when nobody and nothing is recorded", () => {
    expect(
      renderToStaticMarkup(
        <World39Standing
          officeholders={[]}
          standing={[]}
          onOpenPerson={() => {}}
        />,
      ),
    ).toBe("");
  });
});
