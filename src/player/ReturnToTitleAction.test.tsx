import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReturnToTitleAction } from "./ReturnToTitleAction";

const noop = () => undefined;

describe("Return to title in Options", () => {
  it("is a labelled button that warns before leaving an unsaved life", () => {
    const html = renderToStaticMarkup(
      <ReturnToTitleAction
        needsConfirmation
        confirming={false}
        onAskConfirmation={noop}
        onLeave={noop}
      />,
    );
    expect(html).toContain('type="button"');
    expect(html).toContain("Return to title");
    expect(html).toContain('aria-describedby="return-to-title-note"');
    expect(html).toContain("Choose whether to save your latest progress");
  });

  it("tells a saved life it is kept before the title opens", () => {
    const html = renderToStaticMarkup(
      <ReturnToTitleAction
        needsConfirmation={false}
        confirming={false}
        onAskConfirmation={noop}
        onLeave={noop}
      />,
    );
    expect(html).toContain("Choose whether to save your latest progress");
  });
});
