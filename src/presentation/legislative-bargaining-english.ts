import type { EntityId, World } from "../simulation";
import { commitmentsHeldBy, currentProvisionByKey } from "../simulation";
import { draftLineageForMeasure } from "../simulation/legislation-draft-lineage";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishFact,
  type GroundedEnglishPacket,
} from "./grounded-english";
import type { LegislativeBargainingProgress } from "./run-b-conversation-progress";
import type { LegislativeBargainingIntent } from "./legislative-bargaining";

/**
 * Fully worded player replies to a live measure. The banks refer to roles in
 * the saved bill and the current proposal; no designation, state, beneficiary,
 * or sum is embedded in a line. Intent and wording remain separate so changing
 * a sentence cannot change what the conversation commits.
 */
const WORDS: Readonly<
  Record<LegislativeBargainingIntent, AuthoredEnglishBank>
> = {
  "ask-what-they-want": bank("ask-what-they-want", [
    "What do you need changed in {{designation}}?",
  ]),
  "request-support": bank("request-support", [
    "Can I count on your vote for {{designation}}?",
    "Where are you on {{designation}}?",
  ]),
  "offer-targeted-provision": bank("offer-targeted-provision", [
    "I’ll propose {{section}} at {{requested-amount}} for {{beneficiary}}.",
  ]),
  "counter-with-cap": bank("counter-with-cap", [
    "What if {{section}} names {{beneficiary}} with a {{capped-amount}} cap instead?",
  ]),
  "refuse-request": bank("refuse-request", ["I won’t propose that section."]),
  "ask-for-analysis": bank("ask-for-analysis", [
    "What does the fiscal note say about {{designation}}?",
  ]),
  "offer-private-inducement": bank("offer-private-inducement", [
    "I’ll make it worth your while if you vote for {{designation}}.",
  ]),
  "remind-of-commitment": bank("remind-of-commitment", [
    "You said, {{prior-words}} Does that still stand?",
  ]),
};

const REFUSE_PROGRAM_CUT = bank("refuse-request", [
  "I’m keeping {{program-section}} as it is.",
]);

function bank(
  key: LegislativeBargainingIntent,
  lines: readonly string[],
): AuthoredEnglishBank {
  return {
    key: `measure-bargaining:${key}`,
    version: "1",
    surface: "dialogue",
    variants: lines.map((text, index) => ({
      key: `${key}:${index + 1}`,
      kind: "template" as const,
      text,
    })),
  };
}

export interface BargainingWords {
  readonly text: string;
  readonly variantKey: string;
  readonly sourceRecordIds: readonly EntityId[];
}

/**
 * Returns no line when the saved measure or the necessary prior words cannot
 * be established. The caller omits that reply rather than substituting its
 * imperative menu label as something the character supposedly said.
 */
export function bargainingPlayerWords(
  world: World,
  playerPersonId: EntityId,
  addresseePersonId: EntityId,
  progress: LegislativeBargainingProgress,
  intent: LegislativeBargainingIntent,
): BargainingWords | null {
  const subject = progress.subjectFacts;
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === subject.measureId,
  );
  if (
    !measure ||
    measure.designation !== subject.designation ||
    measure.sponsorPersonId !== playerPersonId
  )
    return null;

  // A configured bill keeps the family and parameter version that supplied
  // its amendment invitation in saved lineage. The authored legacy sitting
  // predates that record and remains anchored to its saved measure.
  const invitationSourceId =
    draftLineageForMeasure(world, measure.id)?.id ?? measure.id;
  const programProvision = currentProvisionByKey(
    world,
    measure.id,
    subject.programProvisionKey,
  );

  const fact = (
    text: string,
    sourceRecordIds: readonly EntityId[],
  ): GroundedEnglishFact => ({
    text,
    sourceRecordIds,
  });
  const facts: Record<string, GroundedEnglishFact | undefined> = {
    designation: fact(measure.designation, [measure.id]),
    section: fact(subject.requestedSectionLabel, [invitationSourceId]),
    "requested-amount": fact(subject.requestedAmountLabel, [
      invitationSourceId,
    ]),
    "capped-amount": fact(subject.cappedAmountLabel, [invitationSourceId]),
    beneficiary: fact(subject.requestedBeneficiaryLabel, [invitationSourceId]),
    "program-section": programProvision
      ? fact(subject.programSectionLabel, [programProvision.id])
      : undefined,
  };
  const latest = commitmentsHeldBy(world, addresseePersonId, measure.id).at(-1);
  if (latest?.statement.trim()) {
    const savedWords = latest.statement.trim();
    facts["prior-words"] = fact(
      /^[“"]/.test(savedWords) ? savedWords : `“${savedWords}”`,
      [latest.id],
    );
  }

  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `${measure.stableKey}:${addresseePersonId}:${progress.phase}:${intent}:${world.history.nextSequence}`,
    worldSeed: world.seed,
    bankVersion: "1",
    stage: progress.phase,
    sourceRecordIds: [measure.id],
    facts,
    speaker: { personId: playerPersonId, traits: {} },
    knowledge: Object.entries(facts).flatMap(([factKey, value]) =>
      value
        ? [
            {
              personId: playerPersonId,
              factKey,
              sourceRecordIds: value.sourceRecordIds,
            },
          ]
        : [],
    ),
  };
  const bankForReply =
    intent === "refuse-request" &&
    addresseePersonId !== subject.advocatePersonId
      ? REFUSE_PROGRAM_CUT
      : WORDS[intent];
  const result = renderGroundedEnglish(packet, bankForReply);
  return result.kind === "rendered"
    ? {
        text: result.text,
        variantKey: result.variantKey,
        sourceRecordIds: result.sourceRecordIds,
      }
    : null;
}
