/**
 * Dev mode's why panels in a played world: the record ids come from the
 * played world, not from a fixture.
 *
 * Pinned (Nov 16). Before, the test drew its seed at run time from
 * DEV_WHY_SEED or randomBytes, and its place from that seed, so a red came
 * and went with the draw. The places below were found once by running the
 * test at fixed seeds (Hanover, Illinois passed; Charlotte Amalie, Virgin
 * Islands at seed pin-dw-3 failed the ledger case like Kagman). Kagman I stays
 * here as a red case for item tests-dev-why-year-ledger-red-kagman (Needs
 * cause): its year ledger case fails there.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { findRecord, traceNode } from "./dev-trace";
import { whyPanels } from "./dev-why";
import { DevMode } from "./dev-mode";
import { parameter } from "../core2/parameters";

const PINS = [
  { seed: "pin-dw-0", placeKey: "1732707", name: "Hanover, Illinois" },
  {
    seed: "b99b145d49dbabfd",
    placeKey: "territory:MP:kagman-i",
    name: "Kagman I, Northern Mariana Islands",
  },
];

// Limit: the year ledger case is the slowest, 59.0 s at Hanover and 43.3 s
// at Kagman alone (the world builds in about 13 s in beforeAll); twice the
// slower is about 120 s.
for (const { seed, placeKey, name } of PINS)
  describe(
    `dev why panels: ${name} (seed ${seed})`,
    { timeout: 120_000 },
    () => {
      let world!: ReturnType<typeof buildBenchWorld>;
      let core!: ReturnType<typeof buildBenchWorld>["core"];
      const why = (id: string) => whyPanels(core, id, findRecord(core, id));
      // A person's decisions panel, by its title: other panels (the ledger, the opening savings) sit beside it.
      const decisionsOf = (id: string) =>
        why(id).find((panel) => panel.title.endsWith(": decisions"));
      beforeAll(() => {
        world = buildBenchWorld(seed, gameStartDate(), {
          twoLevel: true,
          placeKey,
        });
        core = world.core;
      }, 60_000);
      it("plays the pinned place", () => {
        expect(world.place.displayName).toBe(name);
      });
      it("a person's year ledger lists pay, hours and cash, and says when receipts are not itemized", () => {
        advanceCore(core, addDays(makeIsoDate(core.date), 120));
        const worker = [...core.people.values()].find(
          (p) =>
            p.alive && p.jobId && core.cashJournal.detailedByOwner.has(p.id),
        );
        // With no itemized worker, someone nobody follows (the player and anyone
        // in focus are followed, and say so in other words).
        const followed =
          worker ??
          [...core.people.values()].find(
            (p) =>
              p.alive &&
              p.id !== core.playerId &&
              !core.focusPersonIds.has(p.id),
          )!;
        const [ledger] = why(followed.id);
        expect(ledger!.title).toContain(core.date);
        expect(ledger!.rows.map((r) => r.label)).toEqual(
          expect.arrayContaining(["hours worked / planned", "cash now"]),
        );
        if (worker)
          expect(ledger!.rows.some((r) => r.label === "pay")).toBe(true);
        else expect(ledger!.gap).toContain("not itemized");
      }, 240_000);

      it("a followed resident's decisions list each kept act by record id, and an unfollowed one says its acts keep no reasons", () => {
        const where = `${world.place.displayName} (seed ${seed})`;
        const dev = new DevMode(core, world.director, undefined, world.placeId);
        const strangers = [...core.people.values()].filter(
          (p) =>
            p.alive &&
            p.jobId &&
            p.id !== core.playerId &&
            !core.focusPersonIds.has(p.id),
        );
        expect(strangers.length, where).toBeGreaterThan(2);
        const [first, second, unfollowed] = strangers as [
          (typeof strangers)[number],
          (typeof strangers)[number],
          (typeof strangers)[number],
        ];

        // Following spends no time and writes no record; it only puts them in focus.
        const date = core.date;
        const records = core.durableLog.size;
        expect(dev.follow(first.id).status).toBe("dev-mode");
        expect(dev.follow(second.id).status).toBe("dev-mode");
        expect(core.date).toBe(date);
        expect(core.durableLog.size).toBe(records);
        expect(core.focusPersonIds.has(first.id)).toBe(true);
        expect(dev.followStatus(first.id).tier).toBe(first.tier);
        expect(dev.followStatus(unfollowed.id).status).toBe("none");

        // Before any time passes, a followed person has nothing kept yet and says so.
        const empty = decisionsOf(first.id);
        expect(empty!.title).toBe(
          `${first.givenName} ${first.familyName}: decisions`,
        );
        expect(empty!.rows).toEqual([]);
        expect(empty!.gap, where).toContain(
          "No act of this person has been kept",
        );
        // Nor is any payment itemized yet, and the ledger says so in words; a
        // person nobody follows is never itemized.
        const [ledger] = why(first.id);
        expect(core.cashJournal.detailedByOwner.has(first.id), where).toBe(
          false,
        );
        expect(ledger!.gap, where).toBe(
          "No itemized payments in the last year.",
        );
        expect(why(unfollowed.id)[0]!.gap, where).toContain("not itemized");

        // Thirty-five days: the oldest acts have condensed to the chosen option's reasons.
        advanceCore(core, addDays(makeIsoDate(core.date), 35));
        const detailDays = parameter(
          "circleDecisionDetailDays",
          core.data.parameters,
        );
        let condensed = 0;
        for (const person of [first, second]) {
          const decisions = decisionsOf(person.id);
          expect(decisions!.title, where).toContain("decisions");
          expect(decisions!.rows.length, where).toBeGreaterThan(0);
          expect(decisions!.gap, where).toBeUndefined();
          // Every row names its act record: kept, by this person, and the page links it.
          for (const row of decisions!.rows) {
            const act = core.durableLog.get(row.id!);
            expect(act?.kind, `${where} ${row.id}`).toBe("person.acted");
            expect(act!.actorId).toBe(person.id);
            expect(row.label).toContain(act!.date);
            expect(row.label).toContain(act!.actionId!);
            expect(row.label).toContain(row.id!);
          }
          // Newest first.
          const dates = decisions!.rows.map((r) => r.label.slice(0, 10));
          expect(dates, where).toEqual([...dates].sort().reverse());
          // A recent act lists every option it offered with the trait reason shown,
          // the picked one marked; the same act, read from its record.
          const recent = decisions!.rows.find((r) =>
            r.value.toString().includes("offered"),
          );
          expect(recent, `${where}: an act with full scores`).toBeDefined();
          const record = core.durableLog.get(recent!.id!)!;
          const scores = record.decision!.scores!;
          expect(recent!.value.toString().split("\n").length).toBe(
            scores.length,
          );
          expect(
            recent!.value
              .toString()
              .split("\n")
              .filter((l) => l.startsWith("picked")).length,
          ).toBe(1);
          for (const line of recent!.value.toString().split("\n"))
            expect(line).toMatch(/trait [+-]?\d/);
          expect(recent!.value.toString()).toContain(
            `trait ${scores[0]!.reasons.trait > 0 ? "+" : ""}${Math.round(scores[0]!.reasons.trait * 1000) / 1000}`,
          );
          // An old act keeps only the chosen option's reasons (act-record detail window).
          const cutoff = new Date(`${core.date}T00:00:00Z`);
          cutoff.setUTCDate(cutoff.getUTCDate() - detailDays);
          const old = decisions!.rows.filter(
            (r) => r.label.slice(0, 10) < cutoff.toISOString().slice(0, 10),
          );
          for (const row of old) {
            expect(row.value.toString()).toContain(
              "only the chosen option's reasons",
            );
            expect(row.value.toString()).toMatch(/trait [+-]?\d/);
          }
          condensed += old.length;
          // The trace node carries the same panels as the page, the decisions among them.
          const traced = traceNode(core, world.director, person.id).why.map(
            (p) => p.title,
          );
          expect(traced).toEqual(why(person.id).map((p) => p.title));
          expect(traced[0]).toContain("the year to");
          expect(traced).toContain(decisions!.title);
        }

        expect(
          condensed,
          `${where}: acts older than ${detailDays} days condensed`,
        ).toBeGreaterThan(0);

        // Someone nobody follows kept no act with reasons.
        const quiet = decisionsOf(unfollowed.id);
        expect(quiet!.rows, where).toEqual([]);
        expect(quiet!.gap, where).toContain("keep no reasons until followed");

        // Stopping returns them to the quiet case for new acts (their old rows stay).
        expect(dev.unfollow(first.id).status).toBe("none");
        expect(core.focusPersonIds.has(first.id)).toBe(false);
        expect(decisionsOf(first.id)!.gap).toContain(
          "keep no reasons until followed",
        );
        expect(decisionsOf(first.id)!.rows.length).toBeGreaterThan(0);
      }, 240_000);

      it("following someone the player deals with changes nothing, and stopping leaves them kept", () => {
        const dev = new DevMode(core, world.director, undefined, world.placeId);
        const player = core.people.get(core.playerId!)!;
        const circle = [...player.knownIds, ...player.familyIds].find(
          (id) => core.people.get(id)?.alive && core.focusPersonIds.has(id),
        );
        expect(circle, "the player knows someone alive").toBeDefined();
        const before = new Set(core.focusPersonIds);
        expect(dev.follow(circle!).status).toBe("player-circle");
        expect(dev.unfollow(circle!).status).toBe("player-circle");
        expect(core.focusPersonIds).toEqual(before);
        expect(dev.followed().map((row) => row.view.personId)).not.toContain(
          circle,
        );
      });

      it("a business shows its books, and a closing its recorded reason", () => {
        const [orgId] = [...core.finance.businesses.keys()];
        expect(orgId).toBeDefined();
        const [books] = why(orgId!);
        expect(books!.title).toContain("Books behind");
        expect(books!.rows.map((r) => r.label)).toEqual(
          expect.arrayContaining(["sales received", "wages paid", "closed"]),
        );
        const closed = [...core.finance.businesses].find(
          ([, book]) => book.closedAt,
        );
        if (closed) {
          const [panel] = why(`closure:${closed[0]}`);
          expect(
            panel!.rows.find((r) => r.label === "closed")!.value,
          ).toContain(closed[1].closingReasonKey ?? "no reason kept");
        }
      });

      it("a budget line change names its measure and lists the line's history", () => {
        const changes = [...(core.logByKind.get("budget-line-changed") ?? [])];
        expect(
          changes.length,
          "a budget line changed within the run",
        ).toBeGreaterThan(0);
        const panels = why(changes[0]!);
        expect(panels[0]!.title).toContain("changed");
        expect(panels[0]!.rows.map((r) => r.label)).toEqual(
          expect.arrayContaining(["government", "line", "change", "measure"]),
        );
        expect(panels[1]!.title).toContain("History of");
        expect(panels[1]!.rows.length).toBeGreaterThan(0);
      });
    },
  );
