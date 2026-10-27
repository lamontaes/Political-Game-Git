/** A full worker hired away outside the jobs engine (to an official's staff) is a leaver: the firm posts the job again that month. */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

// New Richmond, West Virginia: the one-driver trucking firm that wins the
// schools contract loses its driver to a staff post on 2025-02-19. Before the
// fix the firm noticed only through demand drift and posted on 2025-11-01.
const PLACE_KEY = "5458756";
const SEED = "316714e6a857a0fbf59cec54893baa1a7a979e67ea5fbc4009f891993e48c36b";
const FIRM = "organization_99dd43244afa92df";
const DRIVER_JOB = "work-relationship_51778e3a54bb829c";

it("posts a hired-away driver's job again within a month of the job ending", () => {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE_KEY,
    });
    for (let day = 0; day < 120; day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const job = core.jobs.get(DRIVER_JOB);
    expect(job?.endsAt, "the driver's job ended").toBeDefined();
    const ended = makeIsoDate(job!.endsAt!);
    const positions = (
      coreAPI(core).moduleState("jobs").table("positions").rows() as {
        organizationId: string;
        replacesJobId?: string;
        openedAt: string;
      }[]
    ).filter(
      (p) => p.organizationId === FIRM && p.replacesJobId === DRIVER_JOB,
    );
    expect(positions.length, "the firm posts the driver's job again").toBe(1);
    expect(
      positions[0]!.openedAt <= addDays(ended, 45),
      `posted ${positions[0]!.openedAt}, job ended ${ended}`,
    ).toBe(true);
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
