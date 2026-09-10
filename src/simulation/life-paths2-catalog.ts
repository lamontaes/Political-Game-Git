import type { EducationProgramKind, TimeDemandProfile } from "./types";

/** Versioned fictional offers, not occupation statistics or real vacancies. */
export interface LifePathDefinition {
  readonly id: string;
  readonly version: 1;
  readonly kind: "study" | "work";
  readonly scope: "personal" | "campaign" | "public-office";
  readonly organizationName: string;
  readonly title: string;
  readonly responsibility: string;
  readonly program: EducationProgramKind;
  readonly credential: string | null;
  readonly prerequisiteProgram: EducationProgramKind | null;
  readonly minimumAge: number;
  readonly sessionMinutes: number;
  readonly sessionStartMinute: number;
  readonly minimumGapDays: number;
  readonly requiredSessions: number | null;
  readonly minimumElapsedDays: number;
  readonly sessionCostMinor: number;
  readonly sessionPayMinor: number;
  readonly volunteerSupported: boolean;
  readonly timeDemand: TimeDemandProfile;
  readonly provenance: { readonly kind: "authored"; readonly note: string };
}
const time = (hours: number, rigid: boolean): TimeDemandProfile => ({
  expectedWeekly: { minimumHours: hours, maximumHours: hours },
  attention: "moderate",
  concurrency: "mostly-exclusive",
  scheduleRigidity: rigid ? "rigid" : "flexible",
  interruptibility: "limited",
  locationJurisdictionId: null,
});
const provenance = {
  kind: "authored",
  note: "LIFE-PATHS2 v1 fictional opportunity and terms. Durations, fees and pay are game design, not empirical or legal claims.",
} as const;
export const LIFE_PATHS2_CATALOG: readonly LifePathDefinition[] = [
  {
    id: "college-office-certificate",
    version: 1,
    kind: "study",
    scope: "personal",
    organizationName: "Civic Learning College (fictional)",
    title: "College office administration certificate",
    responsibility: "Study records, correspondence and office administration.",
    program: "postsecondary:office-certificate",
    credential: "Office administration certificate",
    prerequisiteProgram: null,
    minimumAge: 18,
    sessionMinutes: 180,
    sessionStartMinute: 1080,
    minimumGapDays: 7,
    requiredSessions: 24,
    minimumElapsedDays: 161,
    sessionCostMinor: 2500,
    sessionPayMinor: 0,
    volunteerSupported: false,
    timeDemand: time(3, true),
    provenance,
  },
  {
    id: "college-associate",
    version: 1,
    kind: "study",
    scope: "personal",
    organizationName: "Civic Learning College (fictional)",
    title: "Associate degree in public administration",
    responsibility:
      "Study public records, administration and research methods.",
    program: "postsecondary:public-administration-associate",
    credential: "Associate degree in public administration",
    prerequisiteProgram: null,
    minimumAge: 18,
    sessionMinutes: 240,
    sessionStartMinute: 540,
    minimumGapDays: 7,
    requiredSessions: 96,
    minimumElapsedDays: 665,
    sessionCostMinor: 4000,
    sessionPayMinor: 0,
    volunteerSupported: false,
    timeDemand: time(4, true),
    provenance,
  },
  {
    id: "trade-training",
    version: 1,
    kind: "study",
    scope: "personal",
    organizationName: "Community Skills Cooperative (fictional)",
    title: "Repair workshop certificate",
    responsibility:
      "Practice safe workshop procedures and supervised equipment repair.",
    program: "training:repair-certificate",
    credential: "Repair workshop certificate",
    prerequisiteProgram: null,
    minimumAge: 18,
    sessionMinutes: 240,
    sessionStartMinute: 540,
    minimumGapDays: 7,
    requiredSessions: 12,
    minimumElapsedDays: 77,
    sessionCostMinor: 1500,
    sessionPayMinor: 0,
    volunteerSupported: false,
    timeDemand: time(4, true),
    provenance,
  },
  {
    id: "shop-assistant",
    version: 1,
    kind: "work",
    scope: "personal",
    organizationName: "Neighborhood Supply Cooperative (fictional)",
    title: "Shop assistant",
    responsibility:
      "Receive stock and help customers during a four-hour shift.",
    program: "custom:shop-assistant",
    credential: null,
    prerequisiteProgram: null,
    minimumAge: 18,
    sessionMinutes: 240,
    sessionStartMinute: 540,
    minimumGapDays: 1,
    requiredSessions: null,
    minimumElapsedDays: 0,
    sessionCostMinor: 0,
    sessionPayMinor: 7200,
    volunteerSupported: false,
    timeDemand: time(20, true),
    provenance,
  },
  {
    id: "repair-worker",
    version: 1,
    kind: "work",
    scope: "personal",
    organizationName: "Community Skills Cooperative (fictional)",
    title: "Repair worker",
    responsibility: "Complete a supervised equipment repair assignment.",
    program: "custom:repair-worker",
    credential: null,
    prerequisiteProgram: "training:repair-certificate",
    minimumAge: 18,
    sessionMinutes: 360,
    sessionStartMinute: 480,
    minimumGapDays: 1,
    requiredSessions: null,
    minimumElapsedDays: 0,
    sessionCostMinor: 0,
    sessionPayMinor: 15000,
    volunteerSupported: false,
    timeDemand: time(30, true),
    provenance,
  },
  {
    id: "office-assistant",
    version: 1,
    kind: "work",
    scope: "personal",
    organizationName: "Community Records Cooperative (fictional)",
    title: "Office assistant",
    responsibility: "Organize records and prepare correspondence for review.",
    program: "custom:office-assistant",
    credential: null,
    prerequisiteProgram: "postsecondary:office-certificate",
    minimumAge: 18,
    sessionMinutes: 180,
    sessionStartMinute: 840,
    minimumGapDays: 1,
    requiredSessions: null,
    minimumElapsedDays: 0,
    sessionCostMinor: 0,
    sessionPayMinor: 6900,
    volunteerSupported: false,
    timeDemand: time(15, false),
    provenance,
  },
  {
    id: "community-volunteer",
    version: 1,
    kind: "work",
    scope: "personal",
    organizationName: "Community Welcome Association (fictional)",
    title: "Community volunteer",
    responsibility: "Prepare community meeting materials for review.",
    program: "custom:community-volunteer",
    credential: null,
    prerequisiteProgram: null,
    minimumAge: 18,
    sessionMinutes: 120,
    sessionStartMinute: 1080,
    minimumGapDays: 1,
    requiredSessions: null,
    minimumElapsedDays: 0,
    sessionCostMinor: 0,
    sessionPayMinor: 0,
    volunteerSupported: true,
    timeDemand: time(2, false),
    provenance,
  },
  {
    id: "campaign-volunteer",
    version: 1,
    kind: "work",
    scope: "campaign",
    organizationName: "Your active campaign",
    title: "Campaign volunteer",
    responsibility:
      "Prepare meeting materials for the campaign team to review.",
    program: "custom:campaign-volunteer",
    credential: null,
    prerequisiteProgram: null,
    minimumAge: 18,
    sessionMinutes: 120,
    sessionStartMinute: 1080,
    minimumGapDays: 1,
    requiredSessions: null,
    minimumElapsedDays: 0,
    sessionCostMinor: 0,
    sessionPayMinor: 0,
    volunteerSupported: true,
    timeDemand: time(2, false),
    provenance,
  },
  {
    id: "campaign-records-assistant",
    version: 1,
    kind: "work",
    scope: "campaign",
    organizationName: "Your active campaign",
    title: "Campaign records assistant",
    responsibility:
      "Prepare the campaign correspondence and records for review.",
    program: "custom:campaign-records-assistant",
    credential: null,
    prerequisiteProgram: "postsecondary:office-certificate",
    minimumAge: 18,
    sessionMinutes: 180,
    sessionStartMinute: 840,
    minimumGapDays: 1,
    requiredSessions: null,
    minimumElapsedDays: 0,
    sessionCostMinor: 0,
    sessionPayMinor: 7500,
    volunteerSupported: false,
    timeDemand: time(15, false),
    provenance,
  },
];
export function lifePathDefinition(id: string): LifePathDefinition {
  const path = LIFE_PATHS2_CATALOG.find((p) => p.id === id);
  if (!path) throw new Error("This opportunity is not available.");
  return path;
}
