/**
 * The person at a state filing counter is told as a job, never by the agency's name (pool item
 * words-counter-agency-said-as-a-post): where the filing data names an agency and not an elected
 * secretary of state, the state's election chief is the clerk, and the clerk hands over the agency it heads (a fact), and the English side says "head of the <agency>". Played worlds of places drawn from all 56 until one files
 * state races with an agency.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { agencyHeadSaid, counterSaid } from "../english/said-as";
import { counterNarration, openFilingVisit } from "../director/filing-visit";
import { filingClerkFor } from "./modules/filing-clerk";

// Pinned: a draw that finds no state counter with an agency head names every place it passed over.
const seed = process.env.GOLDEN_PATH_SEED ?? "fcp-b";

it(
  "a state election chief at the counter is said by what they do, not by the agency's name",
  { timeout: 900_000 },
  () => {
    setBookkeeping(false);
    const notes: string[] = [];
    for (let draw = 0; draw < 12; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "filing-clerk-post");
      const where = `${place.name} [${place.key}], seed ${seed}:${draw}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const contests = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[];
      for (const contest of contests) {
        const clerk = filingClerkFor(api, contest.id);
        if (clerk?.basis !== "state-appointment") continue;
        // The agency's head, titled by the agency: the row's title is not a post.
        if (!clerk.heads) {
          notes.push(
            `${where}: ${contest.id} names ${clerk.recordId} with an agency it heads`,
          );
          continue;
        }
        expect(clerk.heads, `${where}: ${clerk.recordId}`).toBe(clerk.title);
        // The agency's name is said without a form's parenthesis; a name that
        // is itself an office is said as the office.
        const saidHead = agencyHeadSaid(clerk.heads);
        expect(saidHead, where).not.toMatch(/[()]/);
        // As the counter says it: the person by what they do, the agency once.
        const me =
          core.people.get(core.playerId as never) ??
          [...core.people.values()][0]!;
        const lines = counterNarration(
          core,
          openFilingVisit(
            core,
            me.id,
            [
              {
                id: contest.id,
                title: contest.title,
                filingDeadline: "2026-12-01",
                electionDate: "2027-11-02",
                primaryDate: null,
                termYears: 4,
                kind: "x",
                sourceIds: [],
                seat: { title: contest.title, level: "state" },
              },
            ],
            clerk.personId as never,
          ),
          clerk,
        );
        process.stdout.write(
          `${where}: ${lines.map((l) => l.text).join(" ")}\n`,
        );
        const said = lines.map((l) => l.text).join(" ");
        expect(lines.length, where).toBeGreaterThan(0);
        // The person by what they do, with the agency named once.
        expect(said, where).toContain(saidHead);
        // The counter is the agency itself, never "the head of the ...'s office".
        expect(said, where).not.toMatch(/head of the [^.]*'s (office|counter)/);
        expect(said, where).not.toMatch(/\bthe the\b/);
        // Where a line sends the player, it is the agency's own place.
        if (/head to|step into|back at/.test(said))
          expect(said, where).toContain(counterSaid(clerk.title, clerk.heads));
        return;
      }
      notes.push(`${where}: no state counter with an agency head`);
    }
    throw new Error(
      `no place filed state races through an agency head: ${notes.join("; ")}`,
    );
  },
);
