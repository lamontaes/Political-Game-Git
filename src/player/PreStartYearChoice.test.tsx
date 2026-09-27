import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEW_GAME_SETUP,
  withPreStartYearChoice,
  type NewGameSetup,
} from "../presentation/new-game";
import { PreStartYearChoice } from "./PreStartYearChoice";
import { SetupScreen } from "./PlayerGame";

const ordinary: NewGameSetup = {
  ...DEFAULT_NEW_GAME_SETUP,
  seed: "team-e-prestart-choice",
  startAge: 25,
  startingLife: "ordinary-life",
};

function render(setup: NewGameSetup) {
  return renderToStaticMarkup(
    <PreStartYearChoice setup={setup} onToggle={() => {}} />,
  );
}

describe("New Game pre-start world year choice", () => {
  it("offers an off-by-default choice for a supported ordinary-life start", () => {
    const html = render(ordinary);
    expect(html).toContain("Let the world run for one year before I begin");
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain("disabled");
  });

  it("shows the source reason and disables an unsupported office start", () => {
    const html = render({ ...ordinary, startingLife: "legislative-office" });
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("office starts need their own dated transition");
  });

  it("keeps an invalid selected choice clearable before Begin", () => {
    const selected = withPreStartYearChoice(ordinary, true);
    const html = render({ ...selected, startAge: 18 });
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("disabled");
    expect(html).toContain("Turn this off to continue.");
  });

  it("shows the option at the actual final creator step before Begin", () => {
    const html = renderToStaticMarkup(
      <SetupScreen
        seed={ordinary.seed}
        seedOrigin="fresh"
        previewMode="production"
        initialSetup={ordinary}
        onBack={() => {}}
        onBegin={() => {}}
        problem={null}
      />,
    );
    expect(html).toContain('data-testid="setup-screen"');
    expect(html).toContain('data-testid="creator-prestart-year"');
    expect(html.indexOf('data-testid="creator-prestart-year"')).toBeLessThan(
      html.indexOf('data-testid="begin"'),
    );
  });
});
