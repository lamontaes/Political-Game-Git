/**
 * Does a chamber with no sourced rules refuse, or permit?
 *
 * Minnesota's Senate returns no qualification rows at all, which is not the
 * same thing as a row whose value is unknown. This asks what the game does
 * with the difference, at the only place it matters: somebody who would
 * plainly fail a real requirement.
 */
import { candidacyEligibility } from "../../src/simulation";
import { officeQualifications } from "../../src/simulation/office-qualification-rules";
import { createExplicitGeographyLife } from "../../src/presentation/new-game-geography";

for (const family of ["UPPER_CHAMBER", "LOWER_CHAMBER"] as const) {
  const rows = officeQualifications("US-MN", family, "2026-01-05");
  console.log(
    `US-MN ${family}: ${rows.length} rows${rows.length ? ` (${rows.map((r) => `${r.field}=${JSON.stringify(r.value)}`).join(", ")})` : ""}`,
  );
}

for (const age of [18, 20, 21, 25]) {
  const created = createExplicitGeographyLife({
    placeKey: "2700172",
    seed: `unsourced-chamber:${age}`,
    startAge: age,
    startKind: "normal",
    depth: "begin-adult-life",
  } as never);
  const world = created.game.world;
  const personId = created.game.playerPersonId;
  for (const officeKey of [
    "us-mn-legislature-v1:senate",
    "us-mn-legislature-v1:house",
  ]) {
    const result = candidacyEligibility(world, {
      personId,
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
      officeKey,
      alreadyACandidate: false,
    });
    console.log(
      `  age ${age} ${officeKey.split(":")[1]}: eligible=${result.eligible}${result.blocks.length ? ` :: ${result.blocks.map((b) => b.reason).join(" | ")}` : ""}`,
    );
  }
}
