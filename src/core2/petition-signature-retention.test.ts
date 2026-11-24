// @vitest-environment node
/** A checked petition's signatures go in play; its check keeps the count (keep results, not their history). */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  ELECTIONS_MODULE_ID,
  keepPetitionCheck,
  petitionOf,
  petitionSigners,
} from "./modules/elections";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(
  `drops a petition's signatures once the clerk has checked it, in play (replay ${replay})`,
  { timeout: 900_000 },
  () => {
    const run = (on: boolean) => {
      const previous = setBookkeeping(on);
      try {
        const drawn = drawPlace(replay, "petition-signature-retention");
        const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
          placeKey: drawn.key,
          twoLevel: true,
        });
        const api = coreAPI(core);
        const tables = api.moduleState(ELECTIONS_MODULE_ID);
        const contest = tables.table("contests").rows()[0] as unknown as {
          id: string;
        };
        const filingId = "filing:test:petition";
        tables.table("filings").put({
          id: filingId,
          contestId: contest.id,
          personId: "person:test:candidate",
          status: "petitioning",
          filedWith: "the clerk",
        } as never);
        tables.table("petitions").put({
          id: `petition:${filingId}`,
          filingId,
          contestId: contest.id,
          personId: "person:test:candidate",
          rule: { basis: "read", source: "test", count: 2 },
          needed: 2,
          opened: core.date,
          due: core.date,
          signed: 2,
        } as never);
        for (const signer of ["person:test:a", "person:test:b"])
          tables.table("petitionSignatures").put({
            id: `${filingId}:${signer}`,
            filingId,
            personId: signer,
            on: core.date,
            via: "door",
          } as never);
        const status = keepPetitionCheck(api, filingId, {
          valid: 2,
          struckIds: [],
        });
        return {
          status,
          checked: petitionOf(api, filingId)?.check?.valid,
          signatures: petitionSigners(api, filingId).length,
        };
      } finally {
        setBookkeeping(previous);
      }
    };
    expect(run(false)).toEqual({
      status: "on-ballot",
      checked: 2,
      signatures: 0,
    });
    expect(run(true)).toEqual({
      status: "on-ballot",
      checked: 2,
      signatures: 2,
    });
  },
);
