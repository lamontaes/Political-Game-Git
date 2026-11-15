/**
 * The reporter's invitation names the seat the way the clerk did (pool item
 * press-reporter-names-alderman-race-as-council-member): at a town governed by
 * a Board of Aldermen the player files for "alderman", and the call that
 * follows asks about running for "alderman", never "council member". The
 * route is the ordinary one (the player files, the weeks play, the press
 * engine invites, the director composes the scene); pinned to two Board of
 * Aldermen towns, Aberdeen, Mississippi and Abita Springs, Louisiana.
 *
 * Re-pinned Nov 15 (lead's yes, 09:02Z). The first pin was Shelby,
 * Mississippi, where the interview check saw it, and where the market's TV
 * stations invited the player. That premise no longer holds: a market's
 * stations now weigh a village's race against their own audience
 * (press-market-stations-seek-village-candidates), so only the town's outlet
 * of record asks. At Shelby that is the town paper, whose reporter has left
 * and whose one remaining staff member, its editor, is this test's player, so
 * no one is left to call. The two other pins were chosen from the record: in
 * each, the town's outlet of record invites the player. The assertions are
 * unchanged.
 */
import { appendFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { fileCandidacy, playerContests } from "../core2/modules/elections";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

const PINS = [
  {
    key: "2800180",
    name: "Aberdeen, Mississippi",
    seed: "1d1c3a7e5b9f48a2c6e0d4b8f2a69c3e7150b4d8a2e6f09c3b7a51d4e8f2c60b",
  },
  {
    key: "2200240",
    name: "Abita Springs, Louisiana",
    seed: "7e3b9d1f5a2c48e6b0d4f8a2c6e19b3d5f70a4c8e2b6d09f3a7c51e4b8d2f60a",
  },
] as const;

it.each(PINS)(
  "the reporter's invitation says alderman where the body is the Board of Aldermen ($name)",
  (PIN) => {
    const where = `${PIN.name} (${PIN.key}), place seed ${PIN.seed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(PIN.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: PIN.key,
    });
    // A grown resident of the town is the player.
    const town = lawChain(coreAPI(core)).townPlaceId;
    const me = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === town &&
          ageOnDate(p.birthDate, core.date) >= 35 &&
          ageOnDate(p.birthDate, core.date) < 60,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]!.id as PersonId;
    core.playerId = me;
    director.watch(core, me);
    const api = coreAPI(core);
    const platform = PLATFORM_QUESTIONS.flatMap((question, index) =>
      index % 3 === 2 ? [] : [`${question}=${index % 2 === 0 ? 1 : -1}`],
    );
    const findContest = () =>
      [...playerContests(api)]
        .filter((c) => c.level !== "federal" && c.level !== "state")
        .filter((c) => c.electionDate >= addDays(makeIsoDate(core.date), 120))
        .sort(
          (a, b) =>
            a.electionDate.localeCompare(b.electionDate) ||
            a.id.localeCompare(b.id),
        )
        .find((c) =>
          ["petitioning", "on-ballot"].includes(
            (
              fileCandidacy(api, {
                personId: me,
                contestId: c.id,
                platform,
                party: null,
              }) as { filing?: { status?: string } }
            ).filing?.status ?? "",
          ),
        );
    let contest = findContest();
    for (let week = 0; week < 52 && !contest; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      contest = findContest();
    }
    expect(contest, `${where}: no race the player could enter`).toBeTruthy();
    gatherSignatures(core, `filing:${contest!.id}:${me}`);
    const seen = new Set<string>();
    let opener: string | null = null;
    while (opener === null && core.date < contest!.electionDate) {
      advanceCore(
        core,
        [addDays(makeIsoDate(core.date), 7), contest!.electionDate].sort()[0]!,
      );
      for (const entry of director.ledger.people.get(me)!.schedule) {
        if (seen.has(entry.momentId)) continue;
        seen.add(entry.momentId);
        if (!entry.bindings.some((row) => row.typeKey === "interview-invite"))
          continue;
        const result = purposeScene(core, director, me, entry, {
          typeKey: "interview-invite",
        });
        if (result?.kind !== "composed") continue;
        opener = result.scene.talk.state.text;
        break;
      }
    }
    expect(opener, `${where}: no invitation reached the player`).toBeTruthy();
    expect(opener, `${where}: ${opener}`).not.toMatch(/council member/i);
    expect(opener, `${where}: ${opener}`).toMatch(/alderman/i);
    if (process.env.LINES_LOG)
      appendFileSync(process.env.LINES_LOG, `${where}\n${opener}\n\n`);
  },
  900_000,
);
