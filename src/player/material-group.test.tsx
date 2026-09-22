import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MaterialGroup } from "./ModularCharacter";

it("keeps per-person loading text without creating competing room live regions", () => {
  const markup = renderToStaticMarkup(
    <>
      <MaterialGroup layers={[]}>
        <span>First person</span>
      </MaterialGroup>
      <MaterialGroup layers={[]}>
        <span>Second person</span>
      </MaterialGroup>
    </>,
  );
  expect(markup.match(/data-material-group-state="loading"/g)).toHaveLength(2);
  expect(markup.match(/Loading character artwork/g)).toHaveLength(2);
  expect(markup).not.toMatch(/role="status"|aria-live=/);
});
