import { describe, expect, it } from "vitest";
import {
  campaignForCandidate,
  deserializeWorld,
  requireElectionContest,
  requireLifePlace,
  serializeWorld,
} from "../simulation";
import { buildProductionWorld } from "./production-world";
import { openOrdinaryLife } from "./ordinary-life";
import { fileForOffice, projectCampaign } from "./campaign-projection";
import { projectCampaignOffices } from "./campaign-office-discovery";

function life() {
  const built = buildProductionWorld({
    seed: "next24-office-choice",
    place: requireLifePlace("kentucky"),
    age: 34,
    givenName: null,
    familyName: null,
    startingLife: "ordinary-life",
    household: "lives-alone",
    depth: "summarize-earlier-life",
  });
  return {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
}

describe("deliberate supported office discovery", () => {
  it("lists established alternatives without writing or inventing timing or connections", () => {
    const { world, personId } = life();
    const before = serializeWorld(world);
    const offices = projectCampaignOffices(world, personId);
    expect(offices.map((office) => office.officeKey)).toEqual([
      "us-ky-general-assembly-v1:house",
      "us-ky-general-assembly-v1:senate",
    ]);
    expect(
      offices.every((office) => office.governmentLevel === "State government"),
    ).toBe(true);
    expect(
      offices.every((office) => office.timing.includes("not established")),
    ).toBe(true);
    expect(offices.every((office) => office.connections.length === 0)).toBe(
      true,
    );
    projectCampaign(world, personId, offices[1]!.officeKey);
    expect(serializeWorld(world)).toBe(before);
    expect(() => fileForOffice(world, personId)).toThrow(
      /Choose an established office/,
    );
    expect(() =>
      fileForOffice(world, personId, null, "invented-office"),
    ).toThrow(/no office/i);
  });

  it("files the explicitly selected alternative through the existing writer and preserves it on reload", () => {
    const { world, personId } = life();
    const selected = "us-ky-general-assembly-v1:senate";
    const filed = fileForOffice(world, personId, null, selected);
    const campaign = campaignForCandidate(filed, personId)!;
    const contest = requireElectionContest(filed, campaign.contestId);
    expect(campaign.officeKey).toBe(selected);
    expect(contest.office.officeKey).toBe(selected);
    expect(
      projectCampaign(filed, personId, "us-ky-general-assembly-v1:house")
        .officeTitle,
    ).toBe(contest.office.title);
    const before = serializeWorld(filed);
    expect(
      projectCampaignOffices(filed, personId).every(
        (office) => !office.eligible,
      ),
    ).toBe(true);
    expect(serializeWorld(filed)).toBe(before);
    const loaded = deserializeWorld(before);
    expect(campaignForCandidate(loaded, personId)).toStrictEqual(campaign);
    expect(requireElectionContest(loaded, campaign.contestId)).toStrictEqual(
      contest,
    );
    expect(() =>
      fileForOffice(loaded, personId, null, "us-ky-general-assembly-v1:house"),
    ).toThrow(/already/i);
  });
});
