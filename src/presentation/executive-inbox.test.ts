import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { projectExecutiveInbox } from "./executive-inbox";
import { GoverningBriefing } from "../player/GoverningBriefing";
import {
  incoming,
  officeWorld,
  staff,
  facts,
} from "../../tests/fixtures/executive-work-world";
import { smallWorld } from "../../tests/fixtures/small-world";
import { recordedMayorDeskPreview } from "../../tests/fixtures/session23-mayor-desk";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import {
  decideGoverningMatter,
  governingMatters,
  governingOfficeForPerson,
} from "../simulation/governing/state-governing";
import { EXECUTIVE_GOVERNING_KERNELS } from "../simulation/executive-governing-kernel-bank";
import {
  actOnExecutiveWork,
  executiveNextStep,
  synchronizeExecutiveInbox,
} from "../simulation/executive-work";
import { recordedCouncilBillPreview } from "../../tests/fixtures/session23-executive-bill";
import { electedExecutiveOfficeForKey } from "../simulation/executive-work-context";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { executiveAuthorityGameProfileForJurisdiction } from "../simulation/executive-authority-game-profile";
import { initializeExecutiveOfficePremiseForReview } from "../simulation/executive-work-entry";
import { executiveRulePackForOfficeKey } from "../simulation/executive-authority-rule-packs";
import { ensureJurisdiction } from "../simulation/national-election-geography";
import { stateJurisdictionForKey } from "../simulation/life-places";

describe("one canonical executive inbox", () => {
  it("does not borrow kernel work or authority from a different office held by the same test subject", () => {
    const fixture = smallWorld({
      place: "4422960",
      seed: "session23-inbox-two-office-refusal",
    });
    const mayor = recordedMayorDeskPreview(fixture.world);
    const review = ensureJurisdiction(mayor, stateJurisdictionForKey("US-KY")!);
    const world = incoming(
      initializeExecutiveOfficePremiseForReview(
        review,
        executiveRulePackForOfficeKey("us-ky-governor")!.packId,
        "2026-02-05",
      ),
    );
    const inbox = projectExecutiveInbox(world, fixture.personId)!;
    expect(inbox.canSpendWorkTime).toBe(false);
    expect(
      [...inbox.significant, ...inbox.more].every(
        (item) => item.kind === "governing",
      ),
    ).toBe(true);
  });
  it("uses the shared profile for all 56 executive keys without changing older body identities", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    for (const place of CHIEF_EXECUTIVE_JURISDICTIONS) {
      const profile = executiveAuthorityGameProfileForJurisdiction(
        `US-${place}`,
      );
      const office = electedExecutiveOfficeForKey(
        profile.pack.office.officeKey,
      )!;
      expect(office.pack).toEqual(profile.pack);
    }
    expect(electedExecutiveOfficeForKey("us-co-governor")?.bodyKey).toBe(
      "executive-office:us-co-governor",
    );
    expect(electedExecutiveOfficeForKey("no-such-office")).toBeNull();
  });
  it("routes actual council presentment to one canonical matter and does not create a second bill intake", () => {
    const fixture = recordedCouncilBillPreview(
      smallWorld({ place: "1150000", seed: "session23-inbox-bill" }).world,
      "session23-inbox-bill",
      { openDesk: false },
    );
    const before = fixture.world;
    const world = synchronizeExecutiveInbox(before);
    if (world.control.kind !== "person")
      throw new Error("The fixture lost person control");
    const personId = world.control.personId;
    const office = governingOfficeForPerson(world, personId)!;
    const matters = governingMatters(world, office.officeKey).filter(
      (matter) => matter.measureId === fixture.measure.id,
    );
    expect(matters).toHaveLength(1);
    expect(
      world.history.workItems.filter((item) =>
        item.stableKey.startsWith("executive-inbox:"),
      ),
    ).toHaveLength(0);
    expect(synchronizeExecutiveInbox(world)).toBe(world);
    const inbox = projectExecutiveInbox(world, personId)!;
    expect(
      [...inbox.significant, ...inbox.more].filter(
        (item) =>
          item.kind === "governing" && item.matter.id === matters[0]!.id,
      ),
    ).toHaveLength(1);
    expect(
      projectExecutiveInbox(deserializeWorld(serializeWorld(world)), personId),
    ).toEqual(inbox);
  });
  it("reads a mayor's actual work IDs without writing, then follows a decision through reload", () => {
    const fixture = smallWorld({
      place: "4422960",
      seed: "session23-inbox-mayor",
    });
    const world = recordedMayorDeskPreview(fixture.world);
    const office = governingOfficeForPerson(world, fixture.personId)!;
    const before = serializeWorld(world);
    const inbox = projectExecutiveInbox(world, fixture.personId)!;
    const items = [...inbox.significant, ...inbox.more];
    expect(items.length).toBeGreaterThan(1);
    expect(items.every((item) => item.kind === "governing")).toBe(true);
    expect(items.map((item) => item.id)).toEqual(
      expect.arrayContaining(
        governingMatters(world, office.officeKey).map(
          (matter) => matter.workItemId,
        ),
      ),
    );
    const html = renderToStaticMarkup(
      createElement(GoverningBriefing, {
        world,
        personId: fixture.personId,
        onWorldChange: () => {
          throw new Error("Inspection wrote a world");
        },
      }),
    );
    expect(html.match(/data-testid="governing-significant"/g)).toHaveLength(1);
    expect(html).not.toContain("No incoming work is recorded.");
    expect(serializeWorld(world)).toBe(before);
    const agenda = governingMatters(world, office.officeKey).find(
      (matter) => matter.family === "agenda",
    )!;
    const chosen = agenda.options.find(
      (option) => option.key !== "priority:none",
    )!;
    const result = decideGoverningMatter(world, agenda.id, chosen.key);
    expect(result.ok).toBe(true);
    const saved = deserializeWorld(serializeWorld(result.world));
    const after = projectExecutiveInbox(saved, fixture.personId)!;
    expect(
      [...after.significant, ...after.more].some(
        (item) => item.kind === "governing" && item.matter.id === agenda.id,
      ),
    ).toBe(false);
    expect(
      governingMatters(saved, office.officeKey).find(
        (matter) => matter.id === agenda.id,
      )?.status,
    ).toBe("decided");
    expect(
      projectExecutiveInbox(
        saved,
        saved.personOrder.find((id) => id !== fixture.personId)!,
      ),
    ).toBeNull();
  });

  it("keeps the existing kernel command and authority guard in the same inbox across save/reload", () => {
    const kernel = EXECUTIVE_GOVERNING_KERNELS.find(
      (record) => record.row.id === "92H-K-003",
    )!;
    const world = facts(
      incoming(staff(officeWorld())),
      kernel.requiredFactKeys,
    ).world;
    if (world.control.kind !== "person")
      throw new Error("The fixture lost person control");
    const personId = world.control.personId;
    const before = serializeWorld(world);
    const inbox = projectExecutiveInbox(world, personId)!;
    const item = inbox.significant.find((record) => record.kind === "work")!;
    expect(item).toBeDefined();
    expect(serializeWorld(world)).toBe(before);
    const next = executiveNextStep(world, item.id, kernel.row.id);
    expect(next.ok).toBe(true);
    const result = actOnExecutiveWork(
      world,
      item.id,
      kernel.row.id,
      "continue",
    );
    expect(result.ok).toBe(true);
    expect(result.world.history.workItems.length).toBeGreaterThan(
      world.history.workItems.length,
    );
    const saved = deserializeWorld(serializeWorld(result.world));
    expect(projectExecutiveInbox(saved, personId)).toEqual(
      projectExecutiveInbox(result.world, personId),
    );
    const foreign = saved.personOrder.find((id) => id !== personId)!;
    const refused = actOnExecutiveWork(
      { ...saved, control: { kind: "person", personId: foreign } },
      item.id,
      kernel.row.id,
      "continue",
    );
    expect(refused.ok).toBe(false);
    expect(refused.world.history.nextSequence).toBe(saved.history.nextSequence);
  });
});
