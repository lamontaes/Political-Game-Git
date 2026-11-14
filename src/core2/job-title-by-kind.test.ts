import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import controls from "../bench/data/controls.json" with { type: "json" };
import { searchCorePlaces } from "./place-lookup";
import { knownCard, personCard } from "../bench/card";
import { employerIsGovernment } from "../english/journal-words";
import { jobTitleByKind, jobTitleSaid } from "./person-work";

/**
 * A government's staff are listed with "City" titles whatever kind of place
 * employs them: "city clerk at the Town of Ranchester" (Words lead, Nov 14,
 * pool item words-job-title-says-city-in-a-town). A title is said by the kind
 * of the government that employs the person.
 */
describe("a job title says its employer's own kind of place", () => {
  it("takes the kind from the employer, and keeps 'city' in a city", () => {
    expect(jobTitleByKind("City clerk", "Town of Ranchester")).toBe(
      "Town clerk",
    );
    expect(jobTitleByKind("City Manager", "TOWN OF RANCHESTER treasury")).toBe(
      "Town Manager",
    );
    expect(jobTitleByKind("City planner", "Charter Township of Green")).toBe(
      "Township planner",
    );
    expect(jobTitleByKind("City Clerk", "Village of Jackson Center")).toBe(
      "Village Clerk",
    );
    expect(jobTitleByKind("City Attorney", "City of Raymond")).toBe(
      "City Attorney",
    );
    expect(jobTitleByKind("City clerk", "CITY OF RAYMOND treasury")).toBe(
      "City clerk",
    );
  });

  it("leaves a title that does not begin with city, or an unnamed kind, as stored", () => {
    expect(jobTitleByKind("County clerk", "County of Sheridan")).toBe(
      "County clerk",
    );
    expect(jobTitleByKind("Attorney", "Wilcox and Associates")).toBe(
      "Attorney",
    );
    expect(jobTitleByKind("City clerk", "Ranchester Municipal")).toBe(
      "City clerk",
    );
    expect(jobTitleByKind("City clerk", undefined)).toBe("City clerk");
    expect(jobTitleByKind("Citywide organizer", "Town of Ranchester")).toBe(
      "Citywide organizer",
    );
  });

  // Named places and seed, never a draw: a township, a town and a city.
  const PLACES = [
    ["Paris", "US-MI", "Township"],
    ["Ranchester", "US-WY", "Town"],
    ["Raymond", "US-WA", null],
  ] as const;
  for (const [name, state, kind] of PLACES) {
    it(`says every government job in ${name} (${state}, seed title-kind:1) by its own kind`, () => {
      const place = searchCorePlaces(name, 3, {
        stateJurisdictionKey: state,
      })[0]!;
      const world = buildBenchWorld("title-kind:1", "2026-10-12", {
        twoLevel: true,
        placeKey: place.key,
      });
      const said: string[] = [];
      for (const job of world.core.jobs.values()) {
        const employer = world.core.organizations.get(job.organizationId);
        if (!/^city /i.test(job.title) || !employer) continue;
        const title = jobTitleSaid(world.core, job);
        said.push(`${title} @ ${employer.name}`);
        if (kind) {
          expect(title, `${job.id} at ${employer.name}`).not.toMatch(/^city /i);
          expect(title).toMatch(new RegExp(`^${kind} `));
        } else expect(title).toBe(job.title);
        // The card says the employer as the journal does, never the payroll's
        // record name ("TOWN OF RANCHESTER treasury").
        const person = [...world.core.people.values()].find(
          (row) => row.jobId === job.id,
        );
        if (person) {
          const said = personCard(world.core, person.id).job?.employer ?? "";
          expect(said, `${job.id}`).not.toMatch(/treasury|[A-Z]{3,}/);
        }
      }
      expect(
        said.length,
        `government jobs titled city in ${name}`,
      ).toBeGreaterThan(0);
    });
  }

  it("says a person works for a government, never at it (Ranchester WY, seed title-kind:1)", () => {
    const place = searchCorePlaces("Ranchester", 3, {
      stateJurisdictionKey: "US-WY",
    })[0]!;
    const world = buildBenchWorld("title-kind:1", "2026-10-12", {
      twoLevel: true,
      placeKey: place.key,
    });
    const people = [...world.core.people.values()];
    const viewer = people[0]!;
    const byJob = new Map(people.map((row) => [row.jobId, row]));
    let checked = 0;
    for (const job of world.core.jobs.values()) {
      const employer = world.core.organizations.get(job.organizationId);
      const person = byJob.get(job.id);
      if (!employer || !person || person.id === viewer.id) continue;
      if (checked >= 12) break;
      if (!employerIsGovernment(employer)) continue;
      const said = (
        knownCard(world.core, viewer.id, person.id).summary ?? []
      ).join(" ");
      if (!/^Works as /.test(said)) continue;
      expect(said, person.id).toMatch(/ for the /);
      expect(said, person.id).not.toMatch(/ at the /);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("words a vote on the office screen's list of acts", () => {
    expect(controls.officeStops.voteCast).toEqual({
      yes: "Yes",
      no: "No",
      abstain: "Abstained",
    });
  });
});
