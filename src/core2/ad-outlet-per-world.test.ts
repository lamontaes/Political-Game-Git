/**
 * The campaign sells ad time from its own world's press. The outlet that sells
 * it used to be a function the press registered in a module-level variable
 * when any world's press opened; now each world's press module carries it
 * (`CoreModule.adOutlet`, the side-registry rule). Two worlds are built in one
 * process, in places drawn from all 56, and each world's ad audience names an
 * organization of its own press and none of the other's. (The old global held
 * a function of the world it was given, so this passes on both; the test
 * guards the per-world read now that nothing is registered.)
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { adAudience, adTimeForSale } from "./modules/campaigns";
import { outletsHere } from "./modules/press";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;

it(`each world's ad audience is its own press's outlet, with two worlds in one process (seed ${seed})`, () => {
  setBookkeeping(false);
  const built: {
    where: string;
    api: ReturnType<typeof coreAPI>;
    organizations: Set<string>;
  }[] = [];
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS && built.length < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "ad-outlet");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const organizations = new Set(
      outletsHere(api)
        .filter((outlet) => outlet.tier !== "national")
        .map((outlet) => outlet.organizationId),
    );
    if (!organizations.size) {
      tried.push(`${where}: no local outlet`);
      continue;
    }
    built.push({ where, api, organizations });
  }
  expect(
    built.length,
    `two places with a local press: ${tried.join("; ")}`,
  ).toBe(2);
  // Both worlds exist now, the second opened last: each reads its own.
  for (const [index, world] of built.entries()) {
    const other = built[1 - index]!;
    expect(adTimeForSale(world.api), world.where).toBe(true);
    const audience = adAudience(world.api, 1);
    expect(audience, world.where).not.toBeNull();
    expect(world.organizations.has(audience!.media), world.where).toBe(true);
    expect(other.organizations.has(audience!.media), world.where).toBe(false);
  }
}, 900_000);
