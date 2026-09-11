/**
 * `npm run fixture:municipal-governance` — regenerate the national fixture.
 *
 * The fixture under `fixtures/source/municipal-governance/national.json` is the
 * artifact the capability boundary actually opens, and it is generated rather
 * than hand-written so that the declarations in `national-corpus.ts` stay the
 * one place a government's facts are stated. Running this twice produces
 * byte-identical output; a test asserts the committed file is what the
 * declarations currently expand to, so an edit to a declaration that was never
 * regenerated fails the build instead of drifting.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { NATIONAL_MUNICIPAL_RESEARCH } from "../../src/source/domains/municipal-governance/national-corpus";
import { packsForResearchCorpus } from "../../src/source/domains/municipal-governance/national-packs";
import { REPO_ROOT } from "./registry";

export const NATIONAL_FIXTURE_PATH =
  "fixtures/source/municipal-governance/national.json";

/** The exact bytes the committed fixture must hold. */
export function renderNationalFixture(): string {
  const artifacts = packsForResearchCorpus(NATIONAL_MUNICIPAL_RESEARCH);
  return `${JSON.stringify(
    {
      __fixture: true,
      fixtureId: "municipal-governance/national",
      artifacts,
    },
    null,
    2,
  )}\n`;
}

function main(): void {
  const rendered = renderNationalFixture();
  writeFileSync(resolve(REPO_ROOT, NATIONAL_FIXTURE_PATH), rendered, "utf-8");
  process.stdout.write(
    `Wrote ${NATIONAL_FIXTURE_PATH} — ${NATIONAL_MUNICIPAL_RESEARCH.governments.length} governments, ${rendered.length} bytes.\n`,
  );
}

if (process.argv[1]?.endsWith("municipal-governance-fixture.ts")) {
  main();
}
