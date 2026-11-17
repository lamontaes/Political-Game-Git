/**
 * The register of every bank line (owner, Nov 16: every line of dialogue or narration is registered
 * and traceable, so there are no leftovers). Computed from the banks in `data/english/parts/` and
 * the engines' own data, with no second list: each piece with its bank, move, tie class, whether
 * the grades or a rule hold it, the scene purposes that use it and whether an engine can place it.
 * The code and data-file scans and the baseline are in scripts/words/line-register.ts; the dev scene
 * view (src/bench/dev-views/scene-trace.ts) reads this. A bank file added under data/english/parts
 * is added to BANKS here, and tests/guards/english/line-register.test.ts fails until it is.
 */
import { composedConversationBank } from "./conversation-words";
import {
  CONVERSATION_BANK,
  MINED_CONVERSATION,
} from "./mined/conversation-bank";
import { playable } from "./bank-parts";
import billPaperJson from "../../data/english/parts/bill-paper.json" with { type: "json" };
import bringItUpJson from "../../data/english/parts/bring-it-up.json" with { type: "json" };
import calendarJson from "../../data/english/parts/calendar.json" with { type: "json" };
import campaignStandingJson from "../../data/english/parts/campaign-standing.json" with { type: "json" };
import choiceNamesJson from "../../data/english/parts/choice-names.json" with { type: "json" };
import conversationJson from "../../data/english/parts/conversation.json" with { type: "json" };
import headlinesJson from "../../data/english/parts/headlines.json" with { type: "json" };
import journalJson from "../../data/english/parts/journal.json" with { type: "json" };
import meetingJson from "../../data/english/parts/meeting.json" with { type: "json" };
import newsJson from "../../data/english/parts/news.json" with { type: "json" };
import newscastJson from "../../data/english/parts/newscast.json" with { type: "json" };
import noticeJson from "../../data/english/parts/notice.json" with { type: "json" };
import openingSpeechJson from "../../data/english/parts/opening-speech.json" with { type: "json" };
import personHistoryJson from "../../data/english/parts/person-history.json" with { type: "json" };
import sceneTalkJson from "../../data/english/parts/scene-talk.json" with { type: "json" };
import sceneWordsJson from "../../data/english/parts/scene-words.json" with { type: "json" };
import speechStagesJson from "../../data/english/parts/speech-stages.json" with { type: "json" };

const BANKS: Record<
  string,
  { parts: RawPiece[]; slots?: Record<string, string> }
> = {
  "bill-paper": billPaperJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  "bring-it-up": bringItUpJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  calendar: calendarJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  "campaign-standing": campaignStandingJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  "choice-names": choiceNamesJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  conversation: conversationJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  headlines: headlinesJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  journal: journalJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  meeting: meetingJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  news: newsJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  newscast: newscastJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  notice: noticeJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  "opening-speech": openingSpeechJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  "person-history": personHistoryJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  "scene-talk": sceneTalkJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  "scene-words": sceneWordsJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
  "speech-stages": speechStagesJson as unknown as {
    parts: RawPiece[];
    slots?: Record<string, string>;
  },
};

/**
 * What a line is tied to, in the order the register reads it.
 *  - `declared`: a use of the piece names its tie (`tie` on the use: stand,
 *    place, law, record or frame).
 *  - `binding`: a composer places it from one named record kind and field
 *    (the Journal's `journal` binding, in the player's own story).
 *  - `facts`: its use names the record facts it needs.
 *  - `subject`: a conversation line, said only through a Subject the tie rule
 *    accepted (src/director/subject-tie.ts: no tie record to the speaker or
 *    the hearer, no Subject); a reply takes the Subject it answers.
 *  - `frame`: a conversation line of the meeting itself (a greeting, a
 *    farewell, an acknowledgment), tied by the two people being there.
 *  - `scene`: a scene line, said inside a scene staged from a cause record,
 *    between the people that record names (not checked per line).
 *  - `document`: printed or shown from one record to a reader, said to no
 *    listener (a headline, a newscast, a notice, a person's history).
 * Below that, lines no enforcement reaches: `slot-pair` fills a slot from the
 * speaker's or hearer's own record; `slot-world` only from other records;
 * `weak` names only the kind of subject it is said about; `none` declares no
 * use. Those three last classes can be said to anyone and are the leftovers.
 */
export type Tie =
  | "declared"
  | "binding"
  | "facts"
  | "subject"
  | "frame"
  | "scene"
  | "document"
  | "slot-pair"
  | "slot-world"
  | "weak"
  | "none";
export type Reach = "reached" | "unreached" | "by-bank";

export interface RegisteredLine {
  key: string;
  bank: string;
  move: string;
  text: string;
  uses: number;
  /** What in the records the line is tied to; see `Tie`. */
  tie: Tie;
  /** The grades or a rule hold it back. */
  held: boolean;
  /** A conversation reply that says nothing of its own: no slot, no fact it needs and three words or fewer ("Oh, my."). */
  empty: boolean;
  /** The scene purposes (situation types' `purpose`) that use it, for scene-talk lines. */
  purposes: string[];
  /** The facts its uses require, joined: what the record must hold for it to be offered. */
  requires: string[];
  /** Whether an engine can offer it: conversation lines are checked against the engine's own data; other banks are read as a whole by their consumer. */
  reach: Reach;
}

interface RawPiece {
  key: string;
  move?: string;
  text: string;
  uses?: {
    requiresFacts?: string[];
    onlyWhen?: string[];
    purpose?: string;
    subject?: string;
    tie?: string;
    journal?: unknown[];
  }[];
}

/**
 * How each bank's lines are kept to a tie where no use says so: the one
 * enforcement its only consumer applies. Banks no code reads are absent.
 */
const BANK_ENFORCEMENT: Readonly<Record<string, Tie>> = {
  conversation: "subject",
  "bring-it-up": "subject",
  "scene-talk": "scene",
  "scene-words": "scene",
  headlines: "document",
  news: "document",
  newscast: "document",
  notice: "document",
  "person-history": "document",
  "bill-paper": "document",
  calendar: "document",
  meeting: "document",
  "choice-names": "document",
  "campaign-standing": "document",
  journal: "binding",
};

/** The conversation subjects that are the meeting itself, tied by two people being in one place. */
const FRAME_SUBJECTS = new Set([
  "greet",
  "greet-phone-self",
  "farewell",
  "ack",
  "lie",
]);

/** The conversation pieces the two conversation paths place (the engine's data and the composed banks). */
export function reachedConversationKeys(): Set<string> {
  const seen = new Set<string>();
  const walkData = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(walkData);
    const row = value as Record<string, unknown>;
    if (typeof row.part === "string") seen.add(row.part);
    if (typeof row.pieceKey === "string") seen.add(row.pieceKey);
    if (Array.isArray(row.parts))
      for (const part of row.parts)
        if (typeof part === "string") seen.add(part);
    Object.values(row).forEach(walkData);
  };
  walkData(MINED_CONVERSATION);
  const subjects = new Set(
    CONVERSATION_BANK.parts.flatMap((part) =>
      part.uses.map((use) => use.subject),
    ),
  );
  for (const subject of subjects) walkData(composedConversationBank(subject));
  return seen;
}

/** A slot's own description says whose record fills it: the speaker's, the player's or a person both know. */
const PAIR_SLOT =
  /\b(?:speaker's|player's|listener's|asker's|both people|household record|their own|someone both)\b/i;

function tieOf(
  piece: RawPiece,
  slots: Record<string, string>,
  bank: string,
): Tie {
  const uses = piece.uses ?? [];
  if (uses.some((use) => use.tie)) return "declared";
  if (uses.some((use) => use.journal?.length)) return "binding";
  if (uses.some((use) => use.requiresFacts?.length || use.onlyWhen?.length))
    return "facts";
  const enforced = BANK_ENFORCEMENT[bank];
  if (enforced && (uses.length || enforced === "document")) {
    if (
      bank === "conversation" &&
      uses.every((use) => FRAME_SUBJECTS.has(use.subject ?? ""))
    )
      return "frame";
    return enforced;
  }
  const named = [...piece.text.matchAll(/\{([\w-]+)\}/g)].map((m) => m[1]!);
  if (named.length)
    return named.some((slot) => PAIR_SLOT.test(slots[slot] ?? ""))
      ? "slot-pair"
      : "slot-world";
  return uses.length ? "weak" : "none";
}

/** A conversation line that carries nothing from the record: its subject's tie is all it has. */
function saysNothing(piece: RawPiece, bank: string): boolean {
  if (bank !== "conversation") return false;
  const uses = piece.uses ?? [];
  if (uses.some((use) => use.requiresFacts?.length || use.onlyWhen?.length))
    return false;
  if (/\{[\w-]+\}/.test(piece.text)) return false;
  if (uses.every((use) => FRAME_SUBJECTS.has(use.subject ?? ""))) return false;
  return piece.text.trim().split(/\s+/).length <= 3;
}

let cached: RegisteredLine[] | undefined;

/** Every bank piece, registered (read once: the banks do not change while the game runs). */
export function bankLines(): RegisteredLine[] {
  return (cached ??= readBankLines());
}

/** One piece by its key, for the dev scene view's line lookup. */
export function lineByKey(key: string): RegisteredLine | undefined {
  return bankLines().find((line) => line.key === key);
}

/** The scene-talk lines of one scene purpose: every line a scene of that type can say. */
export function linesForPurpose(purpose: string): RegisteredLine[] {
  return bankLines().filter((line) => line.purposes.includes(purpose));
}

function readBankLines(): RegisteredLine[] {
  const reached = reachedConversationKeys();
  const lines: RegisteredLine[] = [];
  for (const [bank, file] of Object.entries(BANKS)) {
    const parts = file.parts;
    for (const piece of parts)
      lines.push({
        key: piece.key,
        bank,
        move: piece.move ?? "",
        text: piece.text,
        uses: piece.uses?.length ?? 0,
        tie: tieOf(piece, file.slots ?? {}, bank),
        purposes: [
          ...new Set(
            (piece.uses ?? []).flatMap((use) =>
              use.purpose ? [use.purpose] : [],
            ),
          ),
        ],
        requires: [
          ...new Set(
            (piece.uses ?? []).flatMap((use) => [
              ...(use.requiresFacts ?? []),
              ...(use.onlyWhen ?? []),
            ]),
          ),
        ],
        held: !playable(piece),
        empty: saysNothing(piece, bank),
        reach:
          bank !== "conversation"
            ? "by-bank"
            : reached.has(piece.key)
              ? "reached"
              : "unreached",
      });
  }
  return lines;
}
