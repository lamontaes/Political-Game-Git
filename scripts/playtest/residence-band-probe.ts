/**
 * Where does a residence requirement actually bite?
 *
 * Every candidacy measurement reported so far used either no residence at all
 * or 700 days, and 700 days clears six months and a year under any rounding.
 * The only place a whole-year model changes an answer is the band between.
 * This walks the band a month at a time and prints what refuses and why.
 */
import { candidacyEligibility } from "../../src/simulation";
import { createExplicitGeographyLife } from "../../src/presentation/new-game-geography";
import { letAdultTimePass } from "../../src/presentation/adult-life";

const CASES = [
  ["Minnesota House", "2700172", "us-mn-legislature-v1:house"],
  ["Minnesota Senate", "2700172", "us-mn-legislature-v1:senate"],
  ["Ohio House", "3900198", "us-oh-legislature-v1:house"],
] as const;

for (const [name, placeKey, officeKey] of CASES) {
  console.log(`\n===== ${name}`);
  const created = createExplicitGeographyLife({
    placeKey,
    seed: `residence-band:${officeKey}`,
    startAge: 40,
    startKind: "normal",
    depth: "begin-adult-life",
  } as never);
  let world = created.game.world;
  const personId = created.game.playerPersonId;
  console.log(`  opens ${world.currentDate}`);
  for (let month = 0; month <= 20; month += 1) {
    if (month > 0) world = letAdultTimePass(world, 30);
    const result = candidacyEligibility(world, {
      personId,
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
      officeKey,
      alreadyACandidate: false,
    });
    const reasons = result.blocks.map((block) => block.reason);
    console.log(
      `  ${String(month).padStart(2)} x30d ${world.currentDate} eligible=${result.eligible}${reasons.length ? ` :: ${reasons.join(" | ")}` : ""}`,
    );
  }
}
