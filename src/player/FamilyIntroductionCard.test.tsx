import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  type NewGameSetup,
} from "../presentation/new-game";
import { buildLifeIntroduction } from "../presentation/life-introduction";
import { projectPersonDossier } from "../presentation/person-dossier";
import { serializeWorld } from "../simulation";
import { PersonCard } from "./PersonCard";

describe("the child's first family card", () => {
  it("uses the saved person's portrait and relationship without repeating room presence", () => {
    const setup: NewGameSetup = {
      placeKey: "kentucky",
      startAge: 10,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "family-introduction-card",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    };
    const { world, playerPersonId } = createNewGameWorld(setup);
    const family = buildLifeIntroduction(world, playerPersonId)!.household;
    const parent = family.find((person) =>
      ["your mom", "your dad", "your parent", "your guardian"].includes(
        person.relationship ?? "",
      ),
    )!;
    const dossier = projectPersonDossier(
      world,
      playerPersonId,
      parent.personId,
      {
        presentNow: true,
        rightNow: "Here in the room with you.",
      },
    )!;
    const before = serializeWorld(world);
    const markup = renderToStaticMarkup(
      <PersonCard
        world={world}
        playerId={playerPersonId}
        dossier={dossier}
        pinned={false}
        expanded={false}
        mode="overlay"
        firstIntroduction
        onTogglePin={() => {}}
        onOpenPerson={() => {}}
        talkUnavailable={null}
        onOpenLink={() => {}}
      />,
    );
    expect(markup).toContain('data-first-introduction="true"');
    expect(markup).toContain('data-testid="person-portrait"');
    expect(markup).toContain(dossier.name);
    expect(markup).toContain(parent.relationship!);
    expect(markup).not.toContain("Here in the room with you.");
    expect(markup).not.toContain("You live in the same household.");
    expect(markup).not.toContain("You haven&#x27;t spoken.");
    expect(serializeWorld(world)).toBe(before);
  });
});
