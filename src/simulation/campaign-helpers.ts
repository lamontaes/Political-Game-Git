import { campaignById, requireCampaign } from "./campaign-queries";
import { createWorkRelationship } from "./life";
import type { EntityId, MoneyAmount, World } from "./types";

export type CampaignHelperRole = "volunteer" | "manager";

export interface AddCampaignHelperInput {
  readonly campaignId: EntityId;
  readonly personId: EntityId;
  readonly role: CampaignHelperRole;
  /** A manager is paid; a volunteer has no salary. */
  readonly pay: MoneyAmount | null;
}

/** Record campaign staff in the canonical work relationship history. */
export function addCampaignHelper(
  inputWorld: World,
  input: AddCampaignHelperInput,
): World {
  const campaign = requireCampaign(inputWorld, input.campaignId);
  const person = inputWorld.people[input.personId];
  if (!person) throw new Error(`Campaign helper is missing: ${input.personId}`);
  if (input.personId === campaign.candidatePersonId) {
    throw new Error("A candidate cannot also be campaign staff.");
  }
  if (input.role === "manager" && (!input.pay || input.pay.minorUnits <= 0)) {
    throw new Error("A campaign manager requires a funded salary.");
  }
  if (input.role === "volunteer" && input.pay !== null) {
    throw new Error("A campaign volunteer cannot have a salary.");
  }
  if (
    campaign.staffWorkRelationshipIds.some(
      (id) =>
        inputWorld.history.workRelationships.find((row) => row.id === id)
          ?.personId === input.personId,
    )
  ) {
    throw new Error("This person already helps the campaign.");
  }

  const stableKey = `${campaign.stableKey}:work:${input.role}:${input.personId}`;
  if (
    inputWorld.history.workRelationships.some(
      (row) => row.stableKey === stableKey,
    )
  ) {
    throw new Error(
      `Campaign helper relationship already exists: ${stableKey}`,
    );
  }
  const work = createWorkRelationship(inputWorld, {
    stableKey,
    personId: input.personId,
    organizationId: campaign.organizationId,
    startedAt: inputWorld.currentDate,
    kind:
      input.role === "manager"
        ? "employment:campaign-staff"
        : "volunteer:campaign-staff",
    compensation: input.role === "manager" ? "paid" : "unpaid",
    authority: input.role === "manager" ? "directs-others" : "shared",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: {
      kind: "authored",
      note:
        input.role === "manager"
          ? "A campaign manager was hired through the campaign's recorded payroll."
          : "Somebody who agreed to help, recorded as the work it is.",
    },
    initialRole: {
      title:
        input.role === "manager" ? "Campaign manager" : "Campaign volunteer",
      occupationClassification:
        input.role === "manager"
          ? "service:campaign-manager"
          : "service:campaign-volunteer",
      locationJurisdictionId: campaign.jurisdictionId,
      timeDemand:
        input.role === "manager"
          ? {
              expectedWeekly: { minimumHours: 20, maximumHours: 50 },
              attention: "high",
              concurrency: "mostly-exclusive",
              scheduleRigidity: "mixed",
              interruptibility: "limited",
              locationJurisdictionId: campaign.jurisdictionId,
            }
          : {
              expectedWeekly: { minimumHours: 2, maximumHours: 12 },
              attention: "moderate",
              concurrency: "partly-concurrent",
              scheduleRigidity: "flexible",
              interruptibility: "interruptible",
              locationJurisdictionId: campaign.jurisdictionId,
            },
    },
  });
  const workId = work.history.workRelationships.at(-1)?.id;
  if (!workId)
    throw new Error("Campaign helper work relationship was not created.");
  const campaignRows = work.history.campaigns ?? [];
  const campaignIndex = campaignRows.findIndex((row) => row.id === campaign.id);
  if (campaignIndex < 0)
    throw new Error("Campaign record disappeared while adding staff.");
  const records = [...campaignRows];
  records[campaignIndex] = {
    ...records[campaignIndex]!,
    staffWorkRelationshipIds: [...campaign.staffWorkRelationshipIds, workId],
  };
  return {
    ...work,
    history: { ...work.history, campaigns: records },
  };
}

/** Used by callers that need to distinguish a new hire from an existing one. */
export function campaignHasHelper(
  world: World,
  campaignId: EntityId,
  personId: EntityId,
): boolean {
  const campaign = campaignById(world, campaignId);
  return (
    campaign?.staffWorkRelationshipIds.some(
      (id) =>
        world.history.workRelationships.find((row) => row.id === id)
          ?.personId === personId,
    ) ?? false
  );
}
