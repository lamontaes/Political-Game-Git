// @vitest-environment node
/** A player who lives in a consolidated city-county can file for its local offices where its records file them, and the filing is accepted. */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import corpus from "../../data/source/places/corpus.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import consolidated from "./data/reference/consolidated-county-governments.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { filingWindowOpens } from "./modules/candidacy";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  type ContestRow,
  fileCandidacy,
  isLocalFamily,
  openContests,
} from "./modules/elections";
import {
  countyGeoidsForPlace,
  governmentUnitsForPlace,
} from "./reference/government-units";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const counties = new Set(
  [...consolidated.units, ...consolidated.matchedUnits].map(
    (u) => u.countyGeoid,
  ),
);
const places = (
  ((corpus as unknown as { places?: unknown }).places ?? corpus) as {
    geoid: string;
    sourceName: string;
    stateUsps: string;
  }[]
)
  .filter(
    (p) =>
      p.geoid &&
      // A place with no government of its own answers to the consolidated one.
      !governmentUnitsForPlace(p.geoid).some(
        (u) => u.unitType === "municipality",
      ) &&
      countyGeoidsForPlace(p.geoid).some((c) => counties.has(c)),
  )
  .sort((a, b) => a.geoid.localeCompare(b.geoid));

it(
  `a player in a consolidated city-county files for a local office (replay ${replay})`,
  { timeout: 3_000_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      expect(places.length).toBeGreaterThan(0);
      const tried: string[] = [];
      for (let draw = 0; draw < 6; draw += 1) {
        const picked =
          places[
            Number.parseInt(
              createHash("sha256")
                .update(`${replay}:${draw}`)
                .digest("hex")
                .slice(0, 8),
              16,
            ) % places.length
          ]!;
        const seed = createHash("sha256")
          .update(`${replay}:world:${picked.geoid}`)
          .digest("hex");
        const core = buildBenchWorld(seed, gameStartDate(), {
          placeKey: picked.geoid,
          twoLevel: true,
        }).core;
        const api = coreAPI(core);
        // Through to the day the first local filing window opens.
        const coming = (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .rows() as unknown as ContestRow[]
        )
          .filter(
            (c) => isLocalFamily(c.family) && c.filingDeadline > core.date,
          )
          .sort((a, b) => a.filingDeadline.localeCompare(b.filingDeadline))[0];
        if (coming) {
          const opens = filingWindowOpens(api, coming);
          if (opens > core.date) advanceCore(core, opens);
        }
        const local = openContests(api).filter((c) => isLocalFamily(c.family));
        const adults = [...core.people.values()]
          .filter((p) => p.alive && p.placeId && !p.id.startsWith("husk"))
          .sort(
            (a, b) =>
              a.birthDate.localeCompare(b.birthDate) ||
              a.id.localeCompare(b.id),
          );
        let filed: { contest: string; filing: string } | null = null;
        for (const contest of local) {
          const runner = adults.find((p) =>
            checkEligibility(api, p.id, contest.id, null).every((c) => c.met),
          );
          if (!runner) continue;
          core.playerId = runner.id;
          const result = fileCandidacy(api, {
            personId: runner.id,
            contestId: contest.id,
            platform: [],
            party: null,
          });
          if (result.status === "refused") continue;
          filed = { contest: contest.title, filing: result.filing.id };
          break;
        }
        if (!filed) {
          tried.push(
            `${picked.sourceName}, ${picked.stateUsps} (${picked.geoid}): ${local.length} local contests open, none filed`,
          );
          continue;
        }
        process.stdout.write(
          `CONSOLIDATED-FILING ${picked.sourceName}, ${picked.stateUsps} (${picked.geoid}, seed ${seed}): filed for ${filed.contest}, filing ${filed.filing}\n`,
        );
        expect(filed.filing).toBeTruthy();
        return;
      }
      throw new Error(
        `No consolidated place took a filing: ${tried.join("; ")}`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
