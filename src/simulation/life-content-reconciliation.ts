import { LIFE_CONTENT_92C_KERNELS } from "./life-content-92c";
import { OPENING_LIFE_SCENES } from "./opening-life-content";

/**
 * Exact-key reconciliation for the 62-kernel 92C bank.
 *
 * This is a ledger, not a completion claim. It records which declared kernel
 * keys currently map to authored content in the integrated tree, which remain
 * blocked on missing canonical premises, and which are still unaudited.
 */

export const LIFE_CONTENT_62_KERNEL_KEYS: readonly string[] = [
  "early.school.cubby-space",
  "early.school.crayon-sharing",
  "early.school.playground-turn",
  "early.school.recess-race",
  "early.school.tattle-boundary",
  "early.school.lunchbox-swap",
  "early.school.spilled-paint",
  "early.school.partner-pairing",
  "early.home.bedtime-delay",
  "early.home.chore-resistance",
  "early.home.broken-mug",
  "early.home.food-refusal",
  "early.home.sibling-toy-snatch",
  "early.home.parent-exhaustion",
  "early.home.closet-fear",
  "early.peer.sidewalk-game",
  "early.peer.best-friend-pact",
  "early.peer.secret-whisper",
  "early.peer.toy-damage-accidental",
  "early.peer.dropped-treat",
  "early.peer.roughhouse-line",
  "early.community.lost-pet-flyer",
  "early.community.sidewalk-curb",
  "early.community.curious-neighbor",
  "early.community.library-quiet",
  "early.family.packing-boxes",
  "early.family.hospital-visit",
  "early.family.new-baby-arrival",
  "early.family.separate-apartments",
  "early.family.grandparent-stay",
  "adult.trans.college-vs-work",
  "adult.trans.apprenticeship-sponsor",
  "adult.trans.commuter-strain",
  "adult.trans.drop-class-keep-job",
  "adult.trans.financial-aid-verification",
  "adult.trans.shift-call-in",
  "adult.trans.tip-pooling-dispute",
  "adult.trans.work-injury-reporting",
  "adult.trans.family-business-obligation",
  "adult.trans.coworker-cover-shift",
  "adult.trans.parent-rent-demand",
  "adult.trans.roommate-lease-signing",
  "adult.trans.unpaid-utility-split",
  "adult.trans.eviction-notice-landlord",
  "adult.trans.couch-surfing-decision",
  "adult.trans.broken-transmission",
  "adult.trans.medical-debt-collections",
  "adult.trans.overdraft-cascade",
  "adult.trans.sibling-emergency-loan",
  "adult.trans.payday-loan-temptation",
  "rel.encounter.shift-breakroom",
  "rel.encounter.bus-stop-regular",
  "rel.encounter.study-group-freeloader",
  "rel.encounter.rec-league-rival",
  "rel.encounter.campaign-canvass-partner",
  "rel.encounter.dormant-callback-reunion",
  "civic.encounter.courthouse-rally",
  "civic.encounter.school-board-rezoning",
  "civic.encounter.flooding-sandbag-effort",
  "civic.encounter.zoning-variance-hearing",
  "civic.encounter.union-picket-line",
  "civic.encounter.historical-centennial-parade",
];

export type LifeContentKernelStatus =
  | "registered-existing-content"
  | "opening-adaptation"
  | "premise-blocked"
  | "no-exact-mapping-verified";

export interface LifeContentKernelRow {
  readonly key: string;
  readonly status: LifeContentKernelStatus;
  readonly consumer?: string;
}

/** Kernels that need facts the game does not yet model as ordinary records. */
const PREMISE_BLOCKED: Readonly<Record<string, string>> = {
  "early.family.hospital-visit":
    "Illness/hospital visit premise not authored without invented medical facts.",
  "early.family.new-baby-arrival":
    "Sibling birth premise not authored without invented household change.",
  "early.family.separate-apartments":
    "Custody/separation premise not authored without invented legal facts.",
  "early.family.grandparent-stay":
    "Extended co-residence premise not authored without household transition records.",
  "adult.trans.apprenticeship-sponsor":
    "Sponsorship premise needs explicit apprenticeship-offer records.",
  "adult.trans.financial-aid-verification":
    "Financial-aid verification needs modeled aid-application records.",
  "adult.trans.work-injury-reporting":
    "Injury reporting needs modeled workplace-injury records.",
  "adult.trans.parent-rent-demand":
    "Rent demand needs modeled household-money obligation records.",
  "adult.trans.roommate-lease-signing":
    "Lease signing needs modeled housing-lease records.",
  "adult.trans.unpaid-utility-split":
    "Utility split needs modeled household-bill records.",
  "adult.trans.eviction-notice-landlord":
    "Eviction notice needs modeled housing-eviction records.",
  "adult.trans.couch-surfing-decision":
    "Couch-surfing needs modeled temporary-housing records.",
  "adult.trans.broken-transmission":
    "Vehicle breakdown needs modeled vehicle/transport records.",
  "adult.trans.medical-debt-collections":
    "Medical debt needs modeled debt/collections records.",
  "adult.trans.overdraft-cascade":
    "Overdraft cascade needs modeled banking/debt records.",
  "adult.trans.sibling-emergency-loan":
    "Emergency loan needs modeled personal-debt records.",
  "adult.trans.payday-loan-temptation":
    "Payday loan needs modeled high-cost lending records.",
  "rel.encounter.rec-league-rival":
    "Recreation-league rivalry needs modeled league-participation records.",
  "civic.encounter.courthouse-rally":
    "Courthouse rally needs modeled public-rally institution context.",
  "civic.encounter.school-board-rezoning":
    "School-board rezoning needs modeled board-meeting institution context.",
  "civic.encounter.zoning-variance-hearing":
    "Zoning hearing needs modeled zoning-board institution context.",
  "civic.encounter.union-picket-line":
    "Union picket needs modeled labor-dispute institution context.",
  "civic.encounter.historical-centennial-parade":
    "Centennial parade needs modeled commemoration institution context.",
};

const REGISTERED_92C = new Map(
  LIFE_CONTENT_92C_KERNELS.filter((entry) => entry.isKernel).map((entry) => [
    entry.kernelId,
    `${entry.episodeKey}/${entry.stageKey}`,
  ]),
);

const OPENING_ADAPTATIONS = new Set(
  OPENING_LIFE_SCENES.map((scene) => scene.key).filter(
    (key) => !REGISTERED_92C.has(key),
  ),
);

/** One bounded exact-key comparison against the integrated code tree. */
export function reconcileLifeContent62Kernels(): readonly LifeContentKernelRow[] {
  return LIFE_CONTENT_62_KERNEL_KEYS.map((key) => {
    const registered = REGISTERED_92C.get(key);
    if (registered) {
      return {
        key,
        status: "registered-existing-content",
        consumer: registered,
      };
    }
    if (OPENING_ADAPTATIONS.has(key)) {
      return {
        key,
        status: "opening-adaptation",
        consumer: `opening.${key}/moment`,
      };
    }
    if (PREMISE_BLOCKED[key]) {
      return { key, status: "premise-blocked", consumer: PREMISE_BLOCKED[key] };
    }
    return { key, status: "no-exact-mapping-verified" };
  });
}

export function lifeContentKernelCounts(
  rows: readonly LifeContentKernelRow[] = reconcileLifeContent62Kernels(),
): Readonly<Record<LifeContentKernelStatus, number>> {
  const counts: Record<LifeContentKernelStatus, number> = {
    "registered-existing-content": 0,
    "opening-adaptation": 0,
    "premise-blocked": 0,
    "no-exact-mapping-verified": 0,
  };
  for (const row of rows) counts[row.status]++;
  return counts;
}
