/**
 * A county or township board elects its own chair from its members, and the
 * chamber's record names that post "chair", never a council's "council
 * president" (first-evening packet, Nov 24: "Emily Page now serves as council
 * president of the Maricopa County Board of Supervisors"; A.R.S. § 11-216(A),
 * "The supervisors shall elect a chairman"). The body's presiding officer is
 * that chair. A place is drawn from all 56 on a seed nobody chose;
 * COUNTY_CHAIR_SEED or GOLDEN_PATH_SEED pins one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import {
  LEADERSHIP_MODULE_ID,
  organize,
  presidingOfficer,
  type PostRow,
} from "./modules/leadership";
import { members, memberKey } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const seed =
  process.env.COUNTY_CHAIR_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

it(`a county or township board elects a chair, not a council president (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "county-board-chair");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const board = townSeats(api).find(
      (s) =>
        (s.office.kind === "county-board" ||
          s.office.kind === "township-board") &&
        members(api, s.office.id).length > 0,
    )?.office;
    if (!board) {
      tried.push(`${where}: no seated county or township board`);
      continue;
    }
    organize(api, board.id);
    const posts = api
      .moduleState(LEADERSHIP_MODULE_ID)
      .table("posts")
      .query("byChamber", [board.id]) as unknown as PostRow[];
    const keys = posts.map((p) => p.post);
    expect(keys, `${where}: ${board.id}`).toContain("chair");
    expect(keys, `${where}: ${board.id}`).not.toContain("council-president");
    const chair = posts.find((p) => p.post === "chair")!;
    const seated = members(api, board.id).map(memberKey);
    expect(seated, `${where}: chair of ${board.id}`).toContain(chair.holderId);
    expect(presidingOfficer(api, board.id), `${where}: ${board.id}`).toBe(
      chair.holderId,
    );
    process.stdout.write(
      `COUNTY CHAIR ${where}: ${board.id} (${board.bodyName ?? board.kind}) posts ${keys.join(", ")}; chair ${chair.holderId}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place with a seated county or township board: ${tried.join("; ")}; ${seed}`,
  );
}, 600_000);
