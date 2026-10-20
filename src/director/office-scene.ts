/**
 * The office scene (owner, Oct 14, 2026: scenes carry the consequential
 * dialogue): a floor vote where the goal is one member's vote. When the
 * controlled person sits on the body taking up a bill, the scene finds the
 * one colleague whose recorded position is nearest the controlled person's
 * side while still against it, and offers what the player can do about it:
 * make the case on the bill's question, appeal through the two people's
 * tie, or say nothing.
 *
 * The outcome is the engines', never the scene's. A case or an appeal is
 * recorded as a case made to the target (the speech engine's `case.made`),
 * naming the player as speaker; the views engine moves the target's stance
 * by the player's standing with them (`standingWith`), and the legislature's
 * vote reads that stance through the member's position (`positionOn`).
 * Saying nothing records nothing. No roll and no fixed share decides
 * anything here.
 *
 * Every line is a mined sentence (data/english/parts) with record facts in
 * its slots, chosen by part key in `data/office-scene.json`; a moment with no
 * mined sentence is left unsaid.
 */
import type { EnglishSurface } from "../english/grounded-english";
import addressJson from "../../data/english/parts/address.json" with { type: "json" };
import choiceNamesJson from "../../data/english/parts/choice-names.json" with { type: "json" };
import sceneWordsJson from "../../data/english/parts/scene-words.json" with { type: "json" };
import speechParameters from "../core2/data/speech/parameters.json" with { type: "json" };
import { closenessBetween } from "../core2/closeness";
import {
  billOf,
  bodyOf,
  memberKey,
  memberPosition,
  members,
  provisionStance,
  type MemberPosition,
} from "../core2/modules/legislature";
import { officialOf, officialsIn } from "../core2/modules/officials";
import { CASE_MADE } from "../core2/modules/speech";
import { VIEWS_SPEAKER_KEY } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreState, PersonId, PlaceId } from "../core2/types";
import { heldByGrades } from "../english/english-grades";
import { questionAbout } from "../english/question-names";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import rowsJson from "./data/office-scene.json" with { type: "json" };
import { renderLine, type Fact, type RenderedLine } from "./render";
import { spoken } from "./words";

type Side = "yes" | "no";
interface PartRef {
  bank: string;
  keys?: readonly string[];
  keysBySide?: Readonly<Record<Side, readonly string[]>>;
}
interface ChoiceRow {
  key: string;
  records: "case" | "appeal" | "nothing";
  label: PartRef;
  line?: PartRef;
}
export interface OfficeSceneRows {
  version: string;
  goal: { kind: string };
  narration: { setting: PartRef; present: PartRef; lead: PartRef };
  choices: readonly ChoiceRow[];
  reply: {
    bank: string;
    keysByLean: Readonly<Record<"for" | "against" | "even", readonly string[]>>;
  };
  parameters: Readonly<Record<string, { value: number; tag: string }>>;
}
export const OFFICE_SCENE_ROWS = rowsJson as unknown as OfficeSceneRows;

interface MinedPart {
  key: string;
  text: string;
  shippable: boolean;
}
const BANKS: Readonly<Record<string, ReadonlyMap<string, MinedPart>>> = {
  address: partsOf(addressJson),
  "choice-names": partsOf(choiceNamesJson),
  "scene-words": partsOf(sceneWordsJson),
};
function partsOf(bank: unknown): ReadonlyMap<string, MinedPart> {
  return new Map(
    (bank as { parts: MinedPart[] }).parts.map((part) => [part.key, part]),
  );
}

/** The mined parts a row names, as renderer variants (bank slots as `{{slot}}`). */
function variantsFor(
  ref: PartRef | undefined,
  keys: readonly string[] | undefined,
) {
  if (!ref || !keys) return [];
  const bank = BANKS[ref.bank];
  return keys.flatMap((key) => {
    const part = bank?.get(key);
    if (!part?.shippable || heldByGrades(key)) return [];
    return [
      {
        key,
        text: part.text.replace(
          /\{(\w+)\}/g,
          (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
        ),
      },
    ];
  });
}

const parameter = (rows: OfficeSceneRows, key: string): number => {
  const row = rows.parameters[key];
  if (!row || !Number.isFinite(row.value))
    throw new Error(`Untagged office-scene parameter: ${key}`);
  return row.value;
};

export interface OfficeSceneChoice {
  key: string;
  /** What the player picks, a mined choice name. */
  label: RenderedLine;
  /** What the player says, a mined sentence; none for saying nothing. */
  line: RenderedLine | null;
}

export interface OfficeScene {
  billId: string;
  bodyOfficeId: string;
  playerId: PersonId;
  /** The one member the scene is about. */
  targetId: PersonId;
  side: Side;
  /** The scene's goal, as a record: the target votes the player's way on the bill. */
  goal: { kind: string; personId: PersonId; billId: string; vote: Side };
  setting: { kind: "chamber"; recordId: string };
  /** The body's members who are people, the player and the target among them. */
  presentIds: PersonId[];
  narration: RenderedLine[];
  /** The bill's questions as the case is made on them: the change the player's side wants. */
  questions: { question: string; desiredChange: "enact" | "repeal" }[];
  /** The target's position on the bill when the scene opens, part by part. */
  targetPosition: MemberPosition;
  choices: OfficeSceneChoice[];
}

export interface OfficeSceneResult {
  choiceKey: string;
  /** The events recorded (none for saying nothing). */
  eventIds: string[];
  line: RenderedLine | null;
  /** The target's answer, read from their position after the act. */
  reply: RenderedLine | null;
  before: MemberPosition;
  after: MemberPosition;
}

/**
 * A member the scene can be about: a living person, in a town body or a
 * state or federal one. In a body the officials engine covers, only a member
 * it seated is one: a seat held by someone it has no record of yet has no
 * stance a case can move and no vote that reads it.
 */
function persuadable(
  core: CoreState,
  memberId: string,
  officialsCover: boolean,
): boolean {
  if (core.people.get(memberId)?.alive !== true) return false;
  return !officialsCover || officialOf(coreAPI(core), memberId) !== undefined;
}

/** Whether the officials engine seats the members of this body. */
function officialsCoverBody(
  api: ReturnType<typeof coreAPI>,
  officeId: string,
): boolean {
  const body = bodyOf(api, officeId);
  if (!body) return false;
  const key =
    body.kind === "us-senate"
      ? "US:us-senate"
      : body.kind.startsWith("us-house")
        ? "US:us-house"
        : `${body.jurisdiction}:${body.kind}`;
  return Boolean(officialsIn(api, key).length);
}

/**
 * The player's side on the bill: the vote they have cast, else the side
 * their own position takes. Null when they have no side.
 */
function sideOf(core: CoreState, billId: string, playerId: string) {
  const api = coreAPI(core);
  const chosen = api
    .moduleState("core2-legislature-v1")
    .table("choices")
    .get(`${billId}|${playerId}`) as unknown as { vote: string } | undefined;
  if (chosen?.vote === "yes" || chosen?.vote === "no") return chosen.vote;
  const total = memberPosition(api, billId, playerId).total;
  return total > P.zero ? "yes" : total < P.zero ? "no" : null;
}

/**
 * Compose the scene before the body votes the bill: null when the player does
 * not sit on the body, has no side, or every member who can be moved already
 * stands with them.
 */
export function composeOfficeScene(
  core: CoreState,
  playerId: PersonId,
  billId: string,
  options: { side?: Side; rows?: OfficeSceneRows } = {},
): OfficeScene | null {
  const rows = options.rows ?? OFFICE_SCENE_ROWS;
  const api = coreAPI(core);
  const bill = billOf(api, billId);
  const player = core.people.get(playerId);
  if (!bill || bill.status !== "drafted" || !player?.alive) return null;
  const seated = members(api, bill.bodyOfficeId);
  const own = seated.find((term) => memberKey(term) === playerId);
  if (!own) return null;
  const side = options.side ?? sideOf(core, billId, playerId);
  if (!side) return null;
  const want = side === "yes" ? P.one : -P.one;
  // The target: the colleague nearest the player's side who is still
  // against it (or even), by their recorded position.
  const covered = officialsCoverBody(api, bill.bodyOfficeId);
  const candidates = seated
    .filter((term) => memberKey(term) !== playerId)
    .filter((term) => persuadable(core, memberKey(term), covered))
    .map((term) => ({
      term,
      position: memberPosition(api, billId, memberKey(term)),
    }))
    .filter((row) => row.position.total * want <= P.zero)
    .sort(
      (a, b) =>
        Math.abs(a.position.total) - Math.abs(b.position.total) ||
        memberKey(a.term).localeCompare(memberKey(b.term)),
    );
  const pick = candidates[P.zero];
  if (!pick) return null;
  const targetId = memberKey(pick.term);
  const target = core.people.get(targetId)!;

  const asked = bill.provisions.flatMap((provision) => {
    const stance = provisionStance(api, provision);
    if (!stance) return [];
    return [
      {
        question: stance.question,
        desiredChange: (stance.position * want > P.zero
          ? "enact"
          : "repeal") as "enact" | "repeal",
      },
    ];
  });
  // A bill may carry the same question in several provisions (a budget); the
  // case is made once on each question, as one event, not once per provision.
  const questions = asked.filter(
    (row, at) =>
      asked.findIndex((other) => other.question === row.question) === at,
  );
  if (!questions.length) return null;

  const body = bodyOf(api, bill.bodyOfficeId);
  const town =
    (body ? corePlaceByJurisdictionId(body.jurisdiction as never) : null) ??
    corePlaceByJurisdictionId(player.placeId as never);
  const facts: Record<string, Fact> = {
    name: {
      text: `${target.givenName} ${target.familyName}`,
      sourceRecordIds: [pick.term.id, targetId],
    },
  };
  if (town)
    facts.place = {
      text: spoken(town),
      sourceRecordIds: [bill.bodyOfficeId],
    };
  const named = questions
    .map((row) => questionAbout(row.question))
    .filter((name): name is string => name !== null);
  if (named.length === questions.length && named.length === P.one)
    facts.issue = { text: named[P.zero]!, sourceRecordIds: [bill.id] };

  const say = (
    surface: EnglishSurface,
    holderId: string,
    bankKey: string,
    variants: { key: string; text: string }[],
    lineFacts: Record<string, Fact>,
    moment: string,
  ) =>
    renderLine({
      seed: core.seed,
      surface,
      holderId,
      bankKey,
      version: rows.version,
      variants,
      facts: lineFacts,
      momentKey: `office-scene:${bill.id}:${playerId}:${moment}`,
      fallbackSourceId: bill.id,
    });

  // Where you are and who is there. The chamber itself has no mined
  // sentence yet; the town's does.
  const narration: RenderedLine[] = [];
  const setting = say(
    "scene",
    playerId,
    "office-scene:setting",
    variantsFor(rows.narration.setting, rows.narration.setting.keys),
    facts.place ? { place: facts.place } : {},
    "setting",
  );
  if (setting) narration.push(setting);
  const present = say(
    "scene",
    playerId,
    "office-scene:present",
    variantsFor(rows.narration.present, rows.narration.present.keys),
    { who: facts.name! },
    "present",
  );
  if (present) narration.push(present);
  const lead = say(
    "scene",
    playerId,
    "office-scene:lead",
    variantsFor(rows.narration.lead, rows.narration.lead.keys),
    facts.issue
      ? { name: facts.name!, issue: facts.issue }
      : { name: facts.name! },
    "lead",
  );
  if (lead) narration.push(lead);

  const tie = closenessBetween(core, playerId, targetId);
  const choices: OfficeSceneChoice[] = [];
  for (const row of rows.choices) {
    // An appeal goes through a tie the two have.
    if (row.records === "appeal" && !(tie > P.zero)) continue;
    const label = say(
      "menu",
      playerId,
      `office-scene:choice:${row.key}`,
      variantsFor(row.label, row.label.keys),
      { name: facts.name! },
      `choice:${row.key}`,
    );
    if (!label) continue;
    const line = row.line
      ? say(
          "dialogue",
          playerId,
          `office-scene:line:${row.key}`,
          variantsFor(row.line, row.line.keysBySide?.[side]),
          facts.issue ? { issue: facts.issue } : {},
          `line:${row.key}`,
        )
      : null;
    // A choice that says something is offered only when there are words for it.
    if (row.line && !line) continue;
    choices.push({ key: row.key, label, line });
  }

  return {
    billId: bill.id,
    bodyOfficeId: bill.bodyOfficeId,
    playerId,
    targetId,
    side,
    goal: {
      kind: rows.goal.kind,
      personId: targetId,
      billId: bill.id,
      vote: side,
    },
    setting: { kind: "chamber", recordId: bill.bodyOfficeId },
    presentIds: seated
      .map((term) => memberKey(term))
      .filter((id) => core.people.has(id)),
    narration,
    questions,
    targetPosition: pick.position,
    choices,
  };
}

/**
 * The player acts: a case or an appeal is recorded as a case made to the
 * target on each of the bill's questions, which the views engine reads by
 * the player's standing with them; saying nothing records nothing.
 */
export function chooseOfficeScene(
  core: CoreState,
  scene: OfficeScene,
  choiceKey: string,
  rows: OfficeSceneRows = OFFICE_SCENE_ROWS,
): OfficeSceneResult {
  const choice = scene.choices.find((row) => row.key === choiceKey);
  const row = rows.choices.find((item) => item.key === choiceKey);
  if (!choice || !row) throw new Error(`Not an offered choice: ${choiceKey}`);
  const api = coreAPI(core);
  const before = memberPosition(api, scene.billId, scene.targetId);
  const eventIds: string[] = [];
  if (row.records !== "nothing") {
    const player = core.people.get(scene.playerId)!;
    const speech = (
      speechParameters as Record<
        string,
        {
          value: number;
          stopgapId?: string;
        }
      >
    ).speechImpulse!;
    if (speech.stopgapId) api.stopgap(speech.stopgapId);
    // A case on the merits weighs as a face-to-face case (the speech
    // engine's impulse); an appeal weighs by how close the two are today.
    const impulse =
      row.records === "appeal"
        ? speech.value *
          parameter(rows, "appealClosenessWeight") *
          closenessBetween(core, scene.playerId, scene.targetId)
        : speech.value;
    for (const { question, desiredChange } of scene.questions) {
      const id = `office-scene:${scene.billId}:${scene.playerId}:${scene.targetId}:${choiceKey}:${question}:${core.date}`;
      applyCoreEvent(core, {
        id,
        date: core.date,
        kind: CASE_MADE,
        personIds: [scene.targetId],
        witnessIds: [scene.playerId],
        placeId: player.placeId as PlaceId,
        topic: question,
        desiredChange,
        moodImpulse: impulse,
        facts: {
          [VIEWS_SPEAKER_KEY]: scene.playerId,
          billId: scene.billId,
          scene: rows.goal.kind,
          choice: choiceKey,
        },
        source: {
          tag: "SOURCED",
          citation:
            "Recorded office scene: the case the player chose to make to a member before the vote.",
          asOf: core.date,
        },
      });
      eventIds.push(id);
    }
  }
  const after = memberPosition(api, scene.billId, scene.targetId);
  // The target answers from where they stand on the bill now.
  const lean =
    after.total > P.zero ? "for" : after.total < P.zero ? "against" : "even";
  const reply =
    row.records === "nothing"
      ? null
      : renderLine({
          seed: core.seed,
          surface: "dialogue",
          holderId: scene.targetId,
          bankKey: `office-scene:reply:${lean}`,
          version: rows.version,
          variants: variantsFor(
            { bank: rows.reply.bank },
            rows.reply.keysByLean[lean],
          ),
          facts: {},
          momentKey: `office-scene:${scene.billId}:${scene.targetId}:reply:${choiceKey}`,
          fallbackSourceId: eventIds[P.zero] ?? scene.billId,
        });
  return {
    choiceKey,
    eventIds,
    line: row.records === "nothing" ? null : choice.line,
    reply,
    before,
    after,
  };
}
