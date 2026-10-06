import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { CreatorBirthdayFields } from "./CreatorBirthdayFields";

describe("Creator birthday fields", () => {
  it("does not add a helper line below the controls", () => {
    const markup = renderToStaticMarkup(
      <CreatorBirthdayFields
        setup={{ ...DEFAULT_NEW_GAME_SETUP, seed: "bg21-helper-copy" }}
        yearChosen={false}
        onChange={() => {}}
      />,
    );

    expect(markup).not.toContain("creator-derived-age");
    expect(markup).not.toContain("Next fills");
  });
});
