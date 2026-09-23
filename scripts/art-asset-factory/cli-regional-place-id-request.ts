/**
 * Usage:
 *   cli-regional-place-id-request.ts [--check]
 *
 * Writes the research request that turns the owner's geographic prose into
 * place and county GEOIDs, to `art/regions/regional-place-id-request.md`.
 * With `--check` it writes nothing and exits non-zero if the file on disk has
 * drifted from what the coverage document would produce now.
 *
 * It is generated rather than written by hand for one reason: the request
 * quotes his own envelope and refinement text back to the researcher, and a
 * retyped envelope is a changed question. Regenerate it whenever a region's
 * research or selectors change.
 *
 * The previous round came back as prose, which is why the eighteen regions
 * still show nothing. Everything here exists to make that outcome impossible
 * to repeat: the shape of the answer is stated, the acceptance criteria are
 * failable, and the one region that already has selectors is included as a
 * worked example of the same input producing the required output.
 */

import fs from "fs";
import path from "path";

import coverage from "../../art/regions/regional-scene-places.json";
import type { RegionalSceneCoverageDocument } from "../../src/authoring/regional-scene-coverage";

const OUTPUT = "art/regions/regional-place-id-request.md";
const WORKED_EXAMPLE = "sonoran-desert";

const document = coverage as RegionalSceneCoverageDocument;
const check = process.argv.includes("--check");

function ask(): string {
  const lines: string[] = [];
  const answered = document.regions.filter(
    (entry) => entry.places.includePlaces.length > 0,
  );
  const unanswered = document.regions.filter(
    (entry) =>
      entry.places.includePlaces.length === 0 &&
      entry.places.includeCounties.length === 0 &&
      entry.places.includeStates.length === 0,
  );

  lines.push("# Place and county IDs for the regional introduction scenes");
  lines.push("");
  lines.push(
    "Generated from `art/regions/regional-scene-places.json` by `npm run request:regional-place-ids`. Do not edit by hand; regenerate.",
  );
  lines.push("");
  lines.push(
    `${unanswered.length} of the ${document.regions.length} regional scenes cannot be shown to anybody, because no place, county or state names them. This asks for the identifiers that fix that, and for nothing else.`,
  );
  lines.push("");
  lines.push("## What is being asked for");
  lines.push("");
  lines.push(
    "For each region below, the counties and places whose residents should see that scene, **as Census identifiers**:",
  );
  lines.push("");
  lines.push(
    "**Counties are the cheaper answer and they now work.** A town carries the counties it lies in, so naming a county covers everybody in it without enumerating its towns. Reach for places only where a county is genuinely too coarse.",
  );
  lines.push("");
  lines.push(
    "- `includeCounties` — 5-digit county GEOIDs whose residents should see this scene.",
  );
  lines.push(
    "- `excludeCounties` — 5-digit county GEOIDs to remove, where a broader inclusion would otherwise reach them.",
  );
  lines.push(
    "- `includePlaces` — 7-digit place GEOIDs, for where a whole county is too coarse. A county with a mountain range in it is the usual case.",
  );
  lines.push(
    "- `excludePlaces` — 7-digit place GEOIDs to remove for the same reason.",
  );
  lines.push("");
  lines.push(
    '**An empty list is a real answer.** A region whose honest answer is "no county can be named without more work" should come back with empty lists, not with a guess. It costs nothing: a region nothing matches shows no picture, which is the current behaviour.',
  );
  lines.push("");
  lines.push("## The rules the answer has to satisfy");
  lines.push("");
  lines.push(
    '1. **Every identifier is a quoted string**: `"04019"`, not `4019`. A county is exactly 5 characters and a place exactly 7. Numbers destroy leading zeros, and 21 of the 32 identifiers already in the file begin with one.',
  );
  lines.push(
    "2. **Geography vintage is 2020.** The existing identifiers are 2020 Census and the runtime resolves them against its own place corpus; mixing vintages silently moves a boundary.",
  );
  lines.push(
    "3. **A place GEOID is state + place, not a county nesting code.** A county cannot be derived from it, so a place answer does not imply its county and both are asked for separately.",
  );
  lines.push(
    "4. **Most specific wins, and an exclusion at any level disqualifies the region outright.** Excluding one county from a region genuinely removes it; it is not handed back by a broader inclusion.",
  );
  lines.push(
    '5. **A described area is not an answer.** "The lower, warmer parts of Pima, Pinal and Maricopa" is the input to this question, not its output. The previous round came back in that form, which is why this is being asked again.',
  );
  lines.push("");
  lines.push("## The shape of the answer");
  lines.push("");
  lines.push(
    "The same shape as `regional-scene-places-first-five.json`, which merged cleanly: a JSON array, one object per region, `regionKey` exactly as written below, and a `places` object. Regions may be answered in any order, and a region may be left out entirely if it is not being answered.",
  );
  lines.push("");
  lines.push("```json");
  lines.push("[");
  lines.push("  {");
  lines.push('    "regionKey": "northwoods-lake-forest",');
  lines.push('    "places": {');
  lines.push('      "includeStates": [],');
  lines.push('      "includeCounties": ["26003", "26013"],');
  lines.push('      "excludeCounties": [],');
  lines.push('      "includePlaces": [],');
  lines.push('      "excludePlaces": [],');
  lines.push(
    '      "note": "What this list claims and what it deliberately does not."',
  );
  lines.push("    }");
  lines.push("  }");
  lines.push("]");
  lines.push("```");
  lines.push("");

  const example = document.regions.find(
    (entry) => entry.regionKey === WORKED_EXAMPLE,
  );
  if (example) {
    lines.push("## Worked example: the same input, already converted");
    lines.push("");
    lines.push(
      `\`${example.regionKey}\` was answered in the first round and is in the file now. Its research text reads:`,
    );
    lines.push("");
    if (example.research?.envelope) {
      lines.push(`> **Envelope.** ${example.research.envelope}`);
      lines.push("");
    }
    if (example.research?.countyRefinement) {
      lines.push(`> **Refinement.** ${example.research.countyRefinement}`);
      lines.push("");
    }
    lines.push("And the answer that text produced was:");
    lines.push("");
    lines.push("```json");
    lines.push(
      JSON.stringify(
        {
          regionKey: example.regionKey,
          places: {
            includeStates: example.places.includeStates,
            includeCounties: example.places.includeCounties,
            excludeCounties: example.places.excludeCounties,
            includePlaces: example.places.includePlaces,
            excludePlaces: example.places.excludePlaces,
          },
        },
        null,
        2,
      ),
    );
    lines.push("```");
    lines.push("");
    lines.push(
      "Note what it did with the refinement: rather than naming Pima, Pinal and Maricopa as counties, it named places inside them, because the counties contain high country the scene does not describe. That judgment is the work being asked for.",
    );
    lines.push("");
  }

  lines.push("## The regions");
  lines.push("");
  lines.push(
    `Each region's own research text follows, in the owner's words. Convert it; do not replace it.`,
  );
  lines.push("");

  for (const entry of unanswered) {
    lines.push(`### \`${entry.regionKey}\``);
    lines.push("");
    lines.push(`**${entry.displayName}**`);
    lines.push("");
    const research = entry.research;
    if (research?.envelope) {
      lines.push(`- **Envelope.** ${research.envelope}`);
    }
    if (research?.countyRefinement) {
      lines.push(
        `- **County and locality refinement.** ${research.countyRefinement}`,
      );
    }
    if (research?.appearance) {
      lines.push(`- **What the picture shows.** ${research.appearance}`);
    }
    if (research?.doNotAssume) {
      lines.push(`- **Do not assume.** ${research.doNotAssume}`);
    }
    const context = entry.context;
    if (context) {
      lines.push(
        `- **Tagged as.** ${context.seasons.join("/")}, ${context.landform}, ${context.sceneKind}.`,
      );
    }
    if (research?.sources?.length) {
      lines.push(`- **Sources.** ${research.sources.join(" · ")}`);
    }
    lines.push("");
  }

  if (answered.length > 0) {
    lines.push("## Already answered, not being asked again");
    lines.push("");
    for (const entry of answered) {
      lines.push(
        `- \`${entry.regionKey}\` — ${entry.places.includePlaces.length} place(s).`,
      );
    }
    lines.push("");
    lines.push(
      "Broader coverage for these is welcome as a separate pass, since the existing lists are starter sets rather than the full researched corridor. It is not part of this request.",
    );
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const wanted = ask();
const target = path.join(process.cwd(), OUTPUT);

if (check) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current !== wanted) {
    console.error(
      `ERROR ${OUTPUT} is stale. The coverage document has moved since it was written; run 'npm run request:regional-place-ids'.`,
    );
    process.exit(1);
  }
  console.log(`${OUTPUT} matches the coverage document.`);
} else {
  fs.writeFileSync(target, wanted, "utf8");
  console.log(`Wrote ${OUTPUT}.`);
}
