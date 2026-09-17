import { describe, expect, it } from "vitest";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "../character-history";
import { makeIsoDate } from "../dates";
import { createDemoWorld } from "../demo";
import { recordKinship } from "../life";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, Person, World } from "../types";
import { recordPersonDeath } from "../vitality";
import { createWorld } from "../world";
import {
  beginHealthEpisode,
  crisisOfficeContinuityNotices,
  crisisPersonDeathNotices,
  crisisPersonDeathRecipientNotices,
  discloseHealthEpisode,
  MORTALITY_CAUSE_KEY,
} from "./index";

/**
 * CRUNCH47 C2: one death, separate consequences.
 *
 * B reads the per-recipient family notice; D reads the office notice. Each
 * effect is identified once, so a consumer that stored an effect key writes
 * nothing again on the next read, and the cause of death stays private unless
 * a disclosure actually reached that recipient.
 */
function worldWithFamily(seed: string) {
  const demo = createDemoWorld(seed);
  let world: World = createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
  const add = (key: string, birthDate: string): EntityId => {
    world = createCharacterHistoryContextPerson(world, {
      stableKey: key,
      givenName: "Notice",
      familyName: key.replaceAll(":", "-"),
      birthDate: makeIsoDate(birthDate),
      homeJurisdictionId: world.jurisdictionOrder[0]!,
    });
    return characterHistoryContextPersonId(world, key);
  };
  const subject = add("notice:subject", "1948-03-02");
  const child = add("notice:child", "1979-06-11");
  const sibling = add("notice:sibling", "1951-09-30");
  const stranger = add("notice:stranger", "1966-01-20");
  for (const [key, other, kind] of [
    ["notice:kin:child", child, "lineal:child"],
    ["notice:kin:sibling", sibling, "collateral:sibling"],
  ] as const) {
    world = recordKinship(world, {
      stableKey: key,
      personIds: [subject, other],
      establishedAt: world.currentDate,
      kind,
      provenance: { kind: "authored", note: "notice proof" },
    });
  }
  return { world, subject, child, sibling, stranger };
}

describe("one death reaches each consumer exactly once", () => {
  it("emits a family notice per relative and no notice to a stranger", () => {
    const family = worldWithFamily("crisis-notice-a");
    const died = makeIsoDate(family.world.currentDate);
    // A death cites a canonical cause source; the mortality writer cites the
    // record that produced it, and this proof cites the person's own record.
    const world = recordPersonDeath(family.world, {
      stableKey: "notice:death",
      personId: family.subject,
      diedAt: died,
      causeKey: MORTALITY_CAUSE_KEY,
      sourceEntityIds: [family.subject],
      summary: "A recorded death, for the notice proof.",
      provenance: { kind: "authored", note: "notice proof" },
    });

    const deaths = crisisPersonDeathNotices(world);
    expect(deaths).toHaveLength(1);
    const notices = crisisPersonDeathRecipientNotices(world);
    expect(notices.map((notice) => notice.recipientPersonId).sort()).toEqual(
      [family.child, family.sibling].sort(),
    );
    expect(notices.map((notice) => notice.relationKind).sort()).toEqual([
      "collateral:sibling",
      "lineal:child",
    ]);
    for (const notice of notices) {
      expect(notice.personId).toBe(family.subject);
      expect(notice.deathRecordId).toBe(deaths[0]!.deathRecordId);
      expect(notice.recipientPersonId).not.toBe(family.stranger);
      expect(notice.alreadyKnew).toBe(false);
      // An unresolved ordinary cause is never tellable.
      expect(notice.causeResolved).toBe(false);
      expect(notice.disclosable).toBe(false);
      expect(notice.disclosureRecordId).toBeNull();
    }
    // The same death is not an office matter for anyone who held no office.
    expect(crisisOfficeContinuityNotices(world)).toHaveLength(0);

    // Reading again — including after a save round trip — repeats the keys
    // rather than inventing new ones, so a consumer's dedupe holds.
    const keys = notices.map((notice) => notice.effectKey);
    expect(new Set(keys).size).toBe(keys.length);
    const restored = deserializeWorld(serializeWorld(world));
    expect(
      crisisPersonDeathRecipientNotices(restored).map((n) => n.effectKey),
    ).toEqual(keys);
    // The cursor a consumer keeps excludes what it already read.
    expect(
      crisisPersonDeathRecipientNotices(world, {
        afterSequence: notices[0]!.sequence,
      }),
    ).toHaveLength(0);
  });

  it("tells the cause only to a recipient a disclosure actually reached", () => {
    const family = worldWithFamily("crisis-notice-b");
    let world = beginHealthEpisode(family.world, {
      stableKey: "notice:episode",
      personId: family.subject,
      severity: "serious",
      initialLimitation: "limited",
      origin: { kind: "authored", note: "notice proof" },
      causalParentIds: [],
      initialAccess: "private",
      initialRecipientIds: [],
    });
    const episodeId = world.history.crisisRecords!.find(
      (record) => record.kind === "health-episode",
    )!.id;
    world = discloseHealthEpisode(world, {
      stableKey: "notice:disclosure",
      episodeId,
      personId: family.subject,
      access: "specific-people",
      recipientIds: [family.child],
      decidedByPersonId: family.subject,
    });
    world = recordPersonDeath(world, {
      stableKey: "notice:death",
      personId: family.subject,
      diedAt: makeIsoDate(world.currentDate),
      causeKey: "crisis-health:episode",
      sourceEntityIds: [episodeId],
      summary: "A recorded death, for the notice proof.",
      provenance: { kind: "authored", note: "notice proof" },
    });

    const notices = crisisPersonDeathRecipientNotices(world);
    const child = notices.find((n) => n.recipientPersonId === family.child)!;
    const sibling = notices.find(
      (n) => n.recipientPersonId === family.sibling,
    )!;
    expect(child.causeResolved).toBe(true);
    expect(child.disclosable).toBe(true);
    expect(child.disclosureRecordId).not.toBeNull();
    // The sibling learns of the death, never of the private cause.
    expect(sibling.causeResolved).toBe(true);
    expect(sibling.disclosable).toBe(false);
    expect(sibling.disclosureRecordId).toBeNull();
  });
});
