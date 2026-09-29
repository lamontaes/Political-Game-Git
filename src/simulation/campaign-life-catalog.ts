import {
  CAMPAIGN_LIFE_CATALOG_VERSION,
  type CampaignLifeCatalogEntry,
  type CampaignLifeForm,
} from "./campaign-life-types";

/**
 * The authored catalog for CRUNCH46 party and campaign activity instances.
 *
 * Every number here is a game default for generic content, not a claim about
 * how long any real party's meeting or any real campaign's canvass runs. An
 * actual calendar hold's own start and end always override the default length.
 *
 * In-person forms all happen in the shared community room every ordinary life
 * can already reach, over the one authored attend-journey adapter that exists
 * for it (`ordinary-life:to-meeting-room`, see the presentation layer's
 * `ATTEND_JOURNEYS`). A canvass is a meetup at that room before the doors, as
 * ALIVE44 P2 describes it; no street geography is implied. The phone shift is
 * worked from home and needs no journey.
 */

/** The community room location and the one authored journey that reaches it. */
const COMMUNITY_ROOM = {
  locationKey: "ordinary-life:meeting-room",
  locationLabel: "Community room",
  journeyKey: "ordinary-life:to-meeting-room",
  journeyMinutes: 20,
} as const;

/**
 * A town hall held in a school gym. Only a school or a civic group hosting it
 * puts it here; a party chapter or a campaign committee uses the community
 * room. `journeyKey` stays the shared local journey.
 */
const SCHOOL_GYM = {
  locationKey: "campaign-life:town-hall-school-gym",
  locationLabel: "School gym",
  journeyKey: "ordinary-life:to-meeting-room",
  journeyMinutes: 20,
} as const;

/**
 * Organization classifications that host in a school gym: schools, and civic
 * groups (associations, voluntary groups, organizing nonprofits). A
 * congregation has its own hall and is not listed.
 */
const SCHOOL_OR_CIVIC_HOST =
  /^(service:(private-)?school|community:(association|voluntary|organizing-nonprofit))$/;

/**
 * Where a form is held for this host. Every form uses the community room
 * except a town hall hosted by a school or a civic group.
 */
export function campaignLifeEntryForHost(
  entry: CampaignLifeCatalogEntry,
  hostClassification: string | null,
): CampaignLifeCatalogEntry {
  if (
    entry.form !== "town-hall" ||
    hostClassification === null ||
    !SCHOOL_OR_CIVIC_HOST.test(hostClassification)
  )
    return entry;
  return { ...entry, ...SCHOOL_GYM };
}

/** A remote form: nobody travels, so no journey is disclosed or charged. */
const PHONE_FROM_HOME = {
  locationKey: "campaign-remote-phone",
  locationLabel: "Phone shift from home",
  journeyKey: null,
  journeyMinutes: 0,
} as const;

export const CAMPAIGN_LIFE_CATALOG: Readonly<
  Record<CampaignLifeForm, CampaignLifeCatalogEntry>
> = {
  "organization-meeting": {
    form: "organization-meeting",
    family: "organization-meeting",
    title: "Organizing meeting",
    // Packet default.
    defaultMinutes: 60,
    presence: "in-person",
    ...COMMUNITY_ROOM,
    basis: "authored",
  },
  "door-canvass": {
    form: "door-canvass",
    family: "volunteer-shift",
    title: "Door canvass",
    // Packet default.
    defaultMinutes: 90,
    presence: "in-person",
    ...COMMUNITY_ROOM,
    basis: "authored",
  },
  "phone-shift": {
    form: "phone-shift",
    family: "volunteer-shift",
    title: "Phone shift",
    // Packet default.
    defaultMinutes: 60,
    presence: "remote",
    ...PHONE_FROM_HOME,
    basis: "authored",
  },
  "candidate-guidance": {
    form: "candidate-guidance",
    family: "candidate-guidance",
    title: "Talk about running for office",
    // Packet default.
    defaultMinutes: 30,
    presence: "in-person",
    ...COMMUNITY_ROOM,
    basis: "authored",
  },
  fundraiser: {
    form: "fundraiser",
    family: "support-and-fundraising",
    title: "Small fundraiser",
    // Packet default.
    defaultMinutes: 90,
    presence: "in-person",
    ...COMMUNITY_ROOM,
    basis: "authored",
  },
  "support-request": {
    form: "support-request",
    family: "support-and-fundraising",
    title: "Ask for the chapter's support",
    // AUTHORED DEFAULT FOR MISSING CONTENT: the packet gives no length for a
    // support request. Thirty minutes is the game's own placeholder.
    defaultMinutes: 30,
    presence: "in-person",
    ...COMMUNITY_ROOM,
    basis: "authored",
  },
  "town-hall": {
    form: "town-hall",
    family: "community-event",
    title: "Community town hall",
    // AUTHORED DEFAULT FOR MISSING CONTENT: the packet gives no length for a
    // town hall. Ninety minutes is the game's own placeholder.
    defaultMinutes: 90,
    presence: "in-person",
    ...COMMUNITY_ROOM,
    basis: "authored",
  },
};

export { CAMPAIGN_LIFE_CATALOG_VERSION };

/** The catalog entry for a form, refusing anything the catalog does not list. */
export function campaignLifeCatalogEntry(
  form: CampaignLifeForm,
): CampaignLifeCatalogEntry {
  const entry = (
    CAMPAIGN_LIFE_CATALOG as Readonly<
      Record<string, CampaignLifeCatalogEntry | undefined>
    >
  )[form];
  if (!entry) throw new Error(`That is not a party or campaign activity.`);
  return entry;
}

/** Disclosed with every in-person form's journey; no fare model exists. */
export const CAMPAIGN_LIFE_TRAVEL_COST_DISCLOSURE = "There is no fare.";
