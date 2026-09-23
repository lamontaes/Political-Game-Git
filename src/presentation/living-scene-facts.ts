import type { EntityId, IsoDate, PublicHolderView, World } from "../simulation";
import {
  personName,
  householdMembershipsAt,
  lifePlaceStateIdentities,
} from "../simulation";
import {
  projectOrientationView,
  type OrientationPerson,
  type OrientationStepKey,
} from "./world-orientation";
import { currentPublicOfficeholders } from "./opening-officeholders";
import type { MunicipalOrientationHolder } from "./municipal-orientation-holder";
import { projectOpeningWorldSnapshot } from "./opening-world-snapshot";
import {
  currentOpeningLifeScene,
  openingLifeLocation,
} from "./life-scene-flow";
import {
  livingSceneStagePacket,
  type LivingSceneFamily,
  type LivingSceneStagePacket,
} from "./living-scene-prose";
import type { OpeningRegionalSceneContext } from "./opening-regional-plate";

export interface LivingSceneActor {
  readonly slotKey: string;
  readonly role:
    | "president"
    | "vice-president"
    | "governor"
    | "mayor"
    | "congress-member"
    | "local-official"
    | "household-member"
    | "present-person";
  readonly person: OrientationPerson;
  readonly recordIds: readonly EntityId[];
  readonly provenance: {
    readonly kind:
      | "office-tenure"
      | "legislative-seat"
      | "municipal-participation"
      | "household-membership"
      | "scene-event";
    readonly roleKey: string;
    readonly institutionId: EntityId | null;
  };
  readonly publicTenure: {
    readonly startedAt: IsoDate | null;
    readonly endExclusive: IsoDate | null;
  } | null;
  /** Public role display does not imply personal acquaintance or room presence. */
  readonly presenceBasis:
    "illustrative-public-role" | "known-household" | "current-scene";
}
export interface LivingSceneChapter {
  readonly key: OrientationStepKey | "your-life";
  readonly actors: readonly LivingSceneActor[];
  readonly publicFacts: readonly string[];
  readonly regionContext: OpeningRegionalSceneContext | null;
  readonly stage: LivingSceneStagePacket;
  readonly unavailableRoles: readonly string[];
}

/** Pure saved-world binding. No ensure/generate calls, RNG, presence or travel. */
export function projectLivingSceneOpening(world: World, playerId: EntityId) {
  const snapshot = projectOpeningWorldSnapshot(world, playerId);
  const orientation = snapshot.orientation;
  const view = projectOrientationView(
    orientation,
    (usps) =>
      lifePlaceStateIdentities().find(
        (state) => state.jurisdictionKey === `US-${usps}`,
      )?.name ?? null,
  );
  const displayed = new Map(
    view.steps
      .flatMap((step) => [
        ...step.people,
        ...step.chambers.flatMap((chamber) =>
          chamber.roster.flatMap((row) => (row.person ? [row.person] : [])),
        ),
      ])
      .map((person) => [`${person.personId}:${person.title}`, person]),
  );
  const offices = currentPublicOfficeholders(world);
  const actorFor = (
    holder: PublicHolderView | MunicipalOrientationHolder,
    role: LivingSceneActor["role"],
    slotKey: string,
    institutionId: EntityId | null = null,
  ): LivingSceneActor | null => {
    const person = displayed.get(`${holder.personId}:${holder.title}`);
    if (!person || !world.people[holder.personId]) return null;
    const municipal = "source" in holder;
    const office = offices.find(
      (entry) =>
        entry.personId === holder.personId &&
        !municipal &&
        entry.officeKey === holder.officeKey,
    );
    const institution = municipal
      ? holder.source.organizationId
      : (institutionId ?? office?.organizationId ?? null);
    return {
      slotKey,
      role,
      person,
      recordIds: [
        municipal ? holder.source.participationId : holder.termId,
        ...(institution ? [institution] : []),
      ],
      provenance: {
        kind: municipal
          ? "municipal-participation"
          : role === "congress-member"
            ? "legislative-seat"
            : "office-tenure",
        roleKey: municipal ? holder.source.role : holder.officeKey,
        institutionId: institution,
      },
      publicTenure: municipal
        ? null
        : { startedAt: holder.startedAt, endExclusive: holder.endExclusive },
      presenceBasis: "illustrative-public-role",
    };
  };
  const valid = (actor: LivingSceneActor | null): actor is LivingSceneActor =>
    actor !== null;
  const executives = (
    [
      ["us-president", "president"],
      ["us-vice-president", "vice-president"],
    ] as const
  ).flatMap(([key, role]) => {
    const holder = orientation.executive.find(
      (entry) => entry.officeKey === key,
    );
    const actor = holder ? actorFor(holder, role, role) : null;
    return actor ? [actor] : [];
  });
  const locals = (orientation.locality?.governments ?? []).flatMap(
    (government) =>
      government.holders.map((holder) => ({
        holder,
        institutionId: government.organizationId,
      })),
  );
  const isMayor = (holder: PublicHolderView | MunicipalOrientationHolder) =>
    "source" in holder
      ? holder.source.role === "mayor"
      : /mayor/i.test(holder.title);
  const dc = orientation.homeState?.stateUsps === "DC";
  const dcMayor = dc
    ? locals.find((entry) => isMayor(entry.holder))
    : undefined;
  const stateActors = dc
    ? dcMayor
      ? [
          actorFor(dcMayor.holder, "mayor", "mayor", dcMayor.institutionId),
        ].filter(valid)
      : []
    : orientation.homeState?.governor
      ? [
          actorFor(orientation.homeState.governor, "governor", "governor"),
        ].filter(valid)
      : [];
  // One actual House member and one Senator, never a fabricated 535-person
  // hallway. Either Senator represents the whole state. A House member is
  // shown only when the state has a single seat, so the member is certainly
  // the player's: the first home-state seat used to stand in, which showed a
  // San Antonio life the Representative for Texas's 1st district, in East
  // Texas. The home's own district is not joined for Congress here, and a
  // split city such as San Antonio has no one district to name.
  const homeUsps = orientation.homeState?.stateUsps;
  const congressActors = orientation.congress
    ? [orientation.congress.house, orientation.congress.senate].flatMap(
        (chamber) => {
          const homeSeats = chamber.seats.filter(
            (entry) => entry.stateUsps === homeUsps,
          );
          const seat = (
            chamber.chamberKey !== "us-senate" && homeSeats.length !== 1
              ? []
              : homeSeats
          ).find((entry) => entry.occupant.kind === "member");
          return seat?.occupant.kind === "member"
            ? [
                actorFor(
                  seat.occupant.member,
                  "congress-member",
                  `congress:${seat.seatKey}`,
                  chamber.organizationId,
                ),
              ].filter(valid)
            : [];
        },
      )
    : [];
  const localActors = locals
    .slice(0, 2)
    .map(({ holder, institutionId }, i) =>
      actorFor(
        holder,
        isMayor(holder) ? "mayor" : "local-official",
        `local:${i}`,
        institutionId,
      ),
    )
    .filter(valid);
  const life = snapshot.life.household;
  const homeActors: LivingSceneActor[] = life.household.map((member) => ({
    slotKey: `household:${member.personId}`,
    role: "household-member",
    person: {
      personId: member.personId,
      name: personName(world.people[member.personId]!),
      title: member.relationship ?? "Household member",
      party: null,
      facts: [member.introduction],
    },
    recordIds: householdMembershipsAt(world, member.personId).map(
      (entry) => entry.membership.id,
    ),
    provenance: {
      kind: "household-membership",
      roleKey: member.relationship ?? "household-member",
      institutionId: null,
    },
    publicTenure: null,
    presenceBasis: "known-household",
  }));
  const current = currentOpeningLifeScene(world, playerId);
  const endpointActors: LivingSceneActor[] = (current?.presentPersonIds ?? [])
    .filter((id) => id !== playerId && world.people[id])
    .map((present) => ({
      slotKey: `present:${present}`,
      role: "present-person",
      person: homeActors.find((actor) => actor.person.personId === present)
        ?.person ?? {
        personId: present,
        name: personName(world.people[present]!),
        title: "",
        party: null,
        facts: [],
      },
      recordIds: [current!.eventId],
      provenance: {
        kind: "scene-event",
        roleKey:
          present === current!.counterpartPersonId
            ? "coordination:counterpart"
            : "presence:participant",
        institutionId: null,
      },
      publicTenure: null,
      presenceBasis: "current-scene",
    }));
  const chapter = (
    key: LivingSceneChapter["key"],
    actors: readonly LivingSceneActor[],
    family: LivingSceneFamily,
    publicFacts: readonly string[],
    unavailableRoles: readonly string[] = [],
    regionContext: OpeningRegionalSceneContext | null = null,
  ): LivingSceneChapter => ({
    key,
    actors,
    publicFacts,
    regionContext,
    unavailableRoles,
    stage: livingSceneStagePacket({
      family,
      roles: actors.map((actor) => ({
        slotKey: actor.slotKey,
        personId: actor.person.personId,
        name: actor.person.name,
      })),
      publicFacts,
      asOf: world.currentDate,
      regionKey: regionContext?.placeKey ?? null,
      fallback: publicFacts[0] ?? "",
    }),
  });
  const stateFacts = [
    ...(dc ? ["The Mayor and Council govern the District of Columbia."] : []),
    ...stateActors.map(
      (actor) => `${actor.person.name} — ${actor.person.title}`,
    ),
    ...(stateActors.length
      ? []
      : [
          dc
            ? "Mayor information is unavailable."
            : "Governor information is unavailable.",
        ]),
  ];
  const congressionalFacts = orientation.congress
    ? [orientation.congress.house.name, orientation.congress.senate.name]
    : ["Congressional membership information is unavailable."];
  const localFacts = (orientation.locality?.governments ?? []).map(
    (government) => government.name,
  );
  const region =
    snapshot.beats.find(
      (beat) => beat.key === "state" || beat.key === "district",
    )?.sceneContext ?? null;
  const startingLocation = openingLifeLocation(world, playerId);
  const chapters: LivingSceneChapter[] = [
    chapter(
      "executive",
      executives,
      "executive-briefing",
      executives.map((actor) => `${actor.person.name} — ${actor.person.title}`),
      ["president", "vice-president"].filter(
        (role) => !executives.some((actor) => actor.role === role),
      ),
    ),
    chapter(
      "state",
      stateActors,
      "public-office-work",
      stateFacts,
      stateActors.length ? [] : [dc ? "mayor" : "governor"],
      region,
    ),
    chapter(
      "congress",
      congressActors,
      "congressional-corridor",
      congressionalFacts,
      congressActors.length ? [] : ["congress-member"],
    ),
    chapter(
      "locality",
      localActors,
      "public-office-work",
      localFacts,
      [],
      snapshot.beats.find((beat) => beat.key === "local")?.sceneContext ??
        region,
    ),
    chapter("your-life", homeActors, "home-conversation", [
      ...life.sentences,
      ...life.grounding.map((fact) => fact.text),
    ]),
  ];
  return {
    asOf: world.currentDate,
    revision: world.history.nextSequence,
    chapters,
    startingLocation,
    startingActors: endpointActors,
  };
}
