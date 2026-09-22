import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildTitleLecternHero } from "../presentation/title-lectern-hero";
import type { PlacedScenePerson } from "../presentation/life-scene-people";
import { TITLE_LECTERN_VISUALS } from "../presentation/title-lectern-scene";
import { AmbientTableau } from "./TitleScreen";

/**
 * The defect this covers is a dropped prop, not a drawing bug.
 *
 * `TitleTableau` has always accepted a `hero` and painted it. `AmbientTableau`
 * is the only thing that renders it on the title route, and it never passed
 * one, so the lectern stood empty in every build no matter what art was
 * present. Nothing failed: the room drew, the title drew, and the figure
 * simply was not asked for.
 *
 * So this is rendered rather than unit-checked, and it is rendered BOTH WAYS.
 * A test that only asserts the hero appears would have passed just as happily
 * against a component that ignores the prop and happens to print the name
 * somewhere else; the no-hero control is what makes the positive case mean
 * something.
 *
 * The figure here is synthetic. The real one needs the private title41 pose
 * pack and the corrected audience plate, neither of which is in this
 * repository — `art/authoring/title41/` does not exist in a public checkout,
 * so `TITLE_LECTERN_VISUALS` is empty here and `resolveTitleLecternHero`
 * correctly returns null. That is exactly why the wiring is tested through
 * `buildTitleLecternHero`, which is the same construction without the
 * art-presence guards. This proves the hero reaches the backdrop. It proves
 * nothing about how the drawn person looks, which is the owner's call on a
 * build that has the art.
 */

const SPEAKER: PlacedScenePerson = {
  personId: "person:test:speaker",
  name: "Dana Whitfield",
  relationship: null,
  anchorId: "title41-speaker",
  seated: false,
  leftPercent: 18,
  topPercent: 22,
  widthPercent: 20,
  heightPercent: 63,
  layers: [],
  hasArt: false,
  presence: "Dana Whitfield is standing at the lectern.",
};

const describeRoom = (roomDescription: string) => <p>{roomDescription}</p>;

describe("the title lectern hero reaches the backdrop", () => {
  it("stands the speaker's own room up when a hero resolves", () => {
    const hero = buildTitleLecternHero("Dana Whitfield", SPEAKER);
    const html = renderToStaticMarkup(
      <AmbientTableau resolved={null} hero={hero} still>
        {describeRoom}
      </AmbientTableau>,
    );
    expect(html).toContain('data-title-kind="hero-in-tableau"');
    expect(html).toContain('data-scene-id="title41-community-portrait"');
    expect(html).toContain("Dana Whitfield at the lectern.");
  });

  it("is unchanged from today when no hero resolves", () => {
    const html = renderToStaticMarkup(
      <AmbientTableau resolved={null} hero={null} still>
        {describeRoom}
      </AmbientTableau>,
    );
    expect(html).not.toContain("hero-in-tableau");
    expect(html).not.toContain("title41-community-portrait");
    expect(html).not.toContain("Dana Whitfield");
  });

  /**
   * What this checkout cannot show, said out loud rather than left as a gap.
   *
   * `TitleTableau` paints the figure only when the backdrop's own tier paints:
   * `tier.paintedUrl && hero`. The lectern plate is private art at
   * `art/authoring/title41/inputs/corrected-audience.png`, which no public
   * checkout has, so the tier never paints here and no `data-testid="title-hero"`
   * element is emitted however the wiring behaves. Asserting it absent is
   * therefore not a claim that the hero is broken, and asserting it present is
   * impossible. It is recorded as the measured boundary of this proof, so that
   * nobody later reads two green tests as a drawn person.
   */
  it("draws no figure here, because the private plate is absent", () => {
    const hero = buildTitleLecternHero("Dana Whitfield", SPEAKER);
    const html = renderToStaticMarkup(
      <AmbientTableau resolved={null} hero={hero} still>
        {describeRoom}
      </AmbientTableau>,
    );
    expect(TITLE_LECTERN_VISUALS.size).toBe(0);
    expect(html).toContain('data-painted-tier=""');
    expect(html).not.toContain('data-testid="title-hero"');
  });
});
