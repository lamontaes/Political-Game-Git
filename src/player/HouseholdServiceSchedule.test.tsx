import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { stdout } from "node:process";
import { childServiceFixture } from "../../tests/fixtures/child-service-fixture";
import { drawRandomPlace } from "../../tests/support/random-place";
import { smallWorld } from "../../tests/fixtures/small-world";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import { requestPublicService } from "../simulation/public-service-requests";
import { householdChildServiceSchedule } from "../simulation/public-service-schedule";
import { addSimulationMinutes } from "../simulation/dates";
import { advanceWorld } from "../simulation/world";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { personName } from "../simulation/people";
import { HouseholdServiceSchedule } from "./HouseholdServiceSchedule";

const seeds = Array.from(
  { length: 5 },
  (_, index) => `household-service-ui:${index}`,
);

describe("Public Services: the family reads its existing child-service schedule", () => {
  it.each(seeds)(
    "shows only recorded sessions through Continue (%s)",
    (seed) => {
      const place = drawRandomPlace(seed);
      const admission = smallWorld({ place: place.key, seed });
      if (!legislativePackForJurisdiction(admission.stateJurisdictionId)) {
        expect(
          renderToStaticMarkup(
            <HouseholdServiceSchedule
              world={admission.world}
              parentId={admission.personId}
            />,
          ),
        ).toBe("");
        stdout.write(
          JSON.stringify({
            seed,
            place: place.displayName,
            result:
              "No supported local enactment procedure; no service invented.",
          }) + "\n",
        );
        return;
      }
      const f = childServiceFixture(
        {
          question: "us-policy-positions:education.universal-preschool",
          name: "pre-K",
          age: 4,
        },
        seed,
      );
      const render = (world: typeof f.funded, parentId = f.parentId) =>
        renderToStaticMarkup(
          <HouseholdServiceSchedule world={world} parentId={parentId} />,
        );
      expect(render(f.funded)).toBe("");
      const asked = requestPublicService(f.funded, {
        personId: f.parentId,
        forPersonId: f.childId,
        commitmentId: f.commitmentId,
        start: addSimulationMinutes(f.funded.currentMoment, 30),
        end: addSimulationMinutes(f.funded.currentMoment, 390),
      });
      if (asked.kind !== "scheduled") throw new Error(asked.reason);
      const before = serializeWorld(asked.world);
      const rows = householdChildServiceSchedule(asked.world, f.parentId);
      expect(rows).toHaveLength(1);
      const html = render(asked.world);
      expect(html).toContain("Children&#x27;s service schedule");
      expect(html).toContain(
        renderToStaticMarkup(<>{personName(asked.world.people[f.childId]!)}</>),
      );
      expect(html).toContain(rows[0]!.activityId);
      expect(html).toContain("Session scheduled.");
      expect(html).not.toContain("Session completed.");
      expect(render(asked.world, f.governorId)).toBe("");
      expect(serializeWorld(asked.world)).toBe(before);
      const restored = deserializeWorld(before);
      expect(render(restored)).toBe(html);
      const attended = advanceWorld(restored, 1);
      const completed = render(attended);
      expect(completed).toContain("Session completed.");
      expect(completed).toContain("Attendance check finished.");
      const receipts = attended.history.events.filter(
        (event) => event.type === "service.delivery-recorded",
      );
      expect(receipts).toHaveLength(1);
      const saved = serializeWorld(attended);
      expect(render(deserializeWorld(saved))).toBe(completed);
      expect(serializeWorld(attended)).toBe(saved);
      stdout.write(
        JSON.stringify({
          seed,
          place: place.displayName,
          parentId: f.parentId,
          childId: f.childId,
          child: personName(attended.people[f.childId]!),
          activityId: rows[0]!.activityId,
          attendanceDueItemId: rows[0]!.attendanceDueItemId,
          deliveryId: receipts[0]!.id,
        }) + "\n",
      );
    },
  );
  it.todo(
    "the normal player's Household section renders these saved sessions after the shared shell seam is released",
  );
});
