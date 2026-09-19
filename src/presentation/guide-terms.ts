/**
 * The one term catalog: what the words on the screen mean.
 *
 * A player reading a docket meets "referral", "concurrence" and "presentment"
 * in the same afternoon. Until now the game either said them and hoped, or
 * explained them in one panel's own private copy — the press panel's
 * ground-rule glossary is exactly that, and it stays where it is because it
 * explains a newsroom agreement rather than a legislature. Everything
 * institutional belongs here instead, once, so inline help beside a word and
 * the searchable Guide are two views of the same entry and can never disagree.
 *
 * Two rules hold this module honest.
 *
 * Every definition is written for this game in our own words. Nothing is
 * copied from a chamber's own glossary, and the pages consulted while writing
 * an entry stay in `authoring`, which no player surface renders: a source URL
 * in the middle of play is a research note, not an explanation.
 *
 * An entry describes a term, never the player's own chamber. The game supports
 * many jurisdictions, and their rules genuinely differ, so where a practice is
 * not universal the entry says which record decides instead of asserting a
 * rule that would be wrong somewhere. `contextNote` is where that is said.
 * Nothing here reads the World, and nothing here is a fact about a save.
 */

/** Research notes for the authors of an entry. Never shown in play. */
export interface GuideTermAuthoring {
  readonly sourceNotes: string;
  readonly sourceUrls: readonly string[];
}

export interface GuideTermEntry {
  readonly semanticKey: string;
  /** The term as the player meets it, capitalized as a sentence would be. */
  readonly term: string;
  /** One sentence. This is what an inline popover shows. */
  readonly shortDefinition: string;
  /** The longer reading, for the Guide's entry detail. */
  readonly explanation: string;
  /** Where the practice is not universal, which record actually decides. */
  readonly contextNote?: string;
  readonly relatedKeys: readonly string[];
  readonly authoring: GuideTermAuthoring;
}

const RULE_PACK_CONTEXT =
  "Which chambers this game gives this role, and what it lets that member do, comes from the chamber's own recorded rules rather than from a single nationwide practice.";

export const GUIDE_TERMS: readonly GuideTermEntry[] = [
  {
    semanticKey: "quorum",
    term: "Quorum",
    shortDefinition:
      "The number of members who must be present before a body can act.",
    explanation:
      "A body with fewer members present than its quorum can gather, talk and wait, but it cannot take the decisions that count. Reaching quorum is therefore the first thing a sitting establishes, and losing it stops business until enough members return. The number is set for each body rather than shared across them, so a council and a state chamber can be sitting on the same day under different thresholds.",
    contextNote:
      "The threshold shown for a body in this game is read from that body's own recorded rules; where no quorum rule has been recorded, the game says so instead of assuming a majority.",
    relatedKeys: ["roll-call", "adjournment", "presiding-officer"],
    authoring: {
      sourceNotes:
        "Written from the quorum provisions already captured in the repository's constitutional-process and state-legislature source snapshots; no wording reused.",
      sourceUrls: ["https://www.senate.gov/about/powers-procedures.htm"],
    },
  },
  {
    semanticKey: "roll-call",
    term: "Roll call",
    shortDefinition:
      "A vote or attendance check taken member by member, so each answer is recorded.",
    explanation:
      "A roll call asks every member in turn and writes down what each one said. That is what makes it different from a show of hands: afterwards there is a record of who was there and how each member voted, which is the record a constituent, an opponent and the press all read later. A vote a body plans to take, or a member's stated intention, is not a roll call until it has actually been taken.",
    relatedKeys: ["quorum", "presiding-officer", "concurrence"],
    authoring: {
      sourceNotes:
        "Written to match the recorded-vote contract the simulation already enforces, where a tally exists only after the vote occurs.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "committee-referral",
    term: "Committee referral",
    shortDefinition:
      "Sending a filed measure to the committee that will consider it first.",
    explanation:
      "Once a measure is filed it usually goes to a committee before the whole body sees it, and the referral is the act of deciding which committee that is. The choice matters: the committee that holds a measure decides whether it is heard, amended or left alone, so a referral can shape a bill's chances as much as its text does. A measure can be referred more than once, and each referral is recorded.",
    relatedKeys: ["committee-chair", "amendment", "docket", "fiscal-note"],
    authoring: {
      sourceNotes:
        "Written from the referral records the legislative domain already keeps; overlaps the older press-side glossary entry of the same name, which is left in place for the news surfaces.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "committee-chair",
    term: "Committee chair",
    shortDefinition:
      "The member who runs a committee's meetings and its agenda.",
    explanation:
      "A chair decides when the committee meets, what it takes up and in what order, and presides while it does. That agenda power is why the chair is often the member a sponsor talks to first about a measure sitting in committee. The chair is a member of the committee, not a separate office above it, and the committee's own rules bound what the chair may decide alone.",
    contextNote: RULE_PACK_CONTEXT,
    relatedKeys: ["committee-referral", "ranking-member", "docket"],
    authoring: {
      sourceNotes:
        "Written from the committee-membership and presiding-role fields the legislature rule packs already carry.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "ranking-member",
    term: "Ranking member",
    shortDefinition:
      "The senior member of a committee from the party that does not hold the chair.",
    explanation:
      "Where committees are organized by party, the largest party normally supplies the chair and the next largest supplies a counterpart, called the ranking member. The role carries no power to set the agenda; its weight comes from being the recognized opposite number, the member consulted about scheduling and the one who leads the questioning from that side.",
    contextNote: RULE_PACK_CONTEXT,
    relatedKeys: ["committee-chair", "caucus", "minority-leader"],
    authoring: {
      sourceNotes:
        "Term is standard in party-organized legislatures. Not currently emitted by any recorded body in this repository, so the entry explains the word and explicitly declines to assert the role exists where the player is.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "presiding-officer",
    term: "Presiding officer",
    shortDefinition:
      "Whoever is in the chair while a body sits, keeping its business in order.",
    explanation:
      "The presiding officer recognizes members who wish to speak, rules on whether a motion is in order, and announces results. It is a function rather than a person: a body's own rules name who presides, and who that is can change from one sitting to the next when the usual holder is absent. Ruling from the chair is not the same as voting, and in some bodies the chair votes only in limited circumstances.",
    contextNote:
      "Each supported body records its own presiding role and title, so the game names that body's officer rather than assuming a speaker, a mayor or a president pro tempore.",
    relatedKeys: ["speaker", "president-pro-tempore", "quorum", "roll-call"],
    authoring: {
      sourceNotes:
        "Written from the presiding-role fields in the legislature rule packs and the municipal governance packs.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "speaker",
    term: "Speaker",
    shortDefinition:
      "The presiding officer of a chamber, usually elected by its members.",
    explanation:
      "A chamber that has a speaker elects one of its own members to preside over it, and that member normally also leads the majority's business: referring measures, recognizing members, and deciding a good deal about what the chamber spends its days on. The title belongs to the chamber, not to the legislature as a whole, so two chambers of the same legislature need not both have one.",
    contextNote:
      "Not every body in this game has a speaker. Where a body's records name a different presiding office, the game uses that name.",
    relatedKeys: [
      "presiding-officer",
      "president-pro-tempore",
      "majority-leader",
    ],
    authoring: {
      sourceNotes:
        "Written from chamber leadership titles already present in the recorded legislature and municipal data.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "president-pro-tempore",
    term: "President pro tempore",
    shortDefinition:
      "The member who presides over a chamber when its regular president is absent.",
    explanation:
      "Some chambers have a president who is not one of their own members, or who is often elsewhere. Those chambers elect a president pro tempore — a member who takes the chair in the meantime and who, in practice, holds the seat most of the time. The Latin means “for the time being”, and the role is a standing one even though the name describes a temporary condition.",
    contextNote:
      "Whether a chamber has this office, and what it lets the holder do, comes from that chamber's own recorded rules.",
    relatedKeys: ["presiding-officer", "speaker", "quorum"],
    authoring: {
      sourceNotes:
        "Title appears in the repository's recorded municipal government leadership data; definition written from the general structure rather than any one body's glossary.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "majority-leader",
    term: "Majority leader",
    shortDefinition:
      "The member who leads the largest party's business in a chamber.",
    explanation:
      "Where a chamber is organized by party, the largest party chooses a leader to carry its program: negotiating what reaches the floor, holding the party's position together in debate, and speaking for it publicly. In chambers whose presiding officer is chosen separately, the majority leader rather than the chair is the member who effectively controls the schedule.",
    contextNote: RULE_PACK_CONTEXT,
    relatedKeys: ["minority-leader", "majority-whip", "caucus", "speaker"],
    authoring: {
      sourceNotes:
        "Standard party-leadership structure. Not asserted of any particular recorded body in this repository.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "minority-leader",
    term: "Minority leader",
    shortDefinition:
      "The member who leads the largest party that is not in the majority.",
    explanation:
      "The minority leader speaks for the side that cannot ordinarily decide what the chamber does. The work is consequently different from the majority leader's: extracting concessions in exchange for cooperation, keeping the party's members voting together, and putting an alternative on the record where it cannot be enacted.",
    contextNote: RULE_PACK_CONTEXT,
    relatedKeys: ["majority-leader", "ranking-member", "caucus"],
    authoring: {
      sourceNotes:
        "Standard party-leadership structure. Not asserted of any particular recorded body in this repository.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "majority-whip",
    term: "Majority whip",
    shortDefinition:
      "The majority's vote counter, responsible for turning members out and holding them together.",
    explanation:
      "A whip finds out, before a vote is called, how each of the party's members intends to vote, tells the leadership whether the votes are there, and works on the members who are not with them. The job is counting and persuasion rather than agenda-setting: a leader decides what to bring up, and the whip decides whether it can survive being brought up.",
    contextNote: RULE_PACK_CONTEXT,
    relatedKeys: ["majority-leader", "caucus", "roll-call"],
    authoring: {
      sourceNotes:
        "Standard party-leadership structure. No recorded body in this repository currently emits a whip role, so the entry explains the term without claiming the role is present.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "caucus",
    term: "Caucus",
    shortDefinition:
      "A group of members who meet as a bloc, most often the members of one party in a chamber.",
    explanation:
      "A caucus is members organizing themselves. A party caucus settles its leadership and its position before the chamber sits, so that what happens in public is largely the working out of what was agreed in private. Caucuses also form around a region, an industry or a single subject, and those have no formal power at all beyond the members who choose to act together.",
    contextNote:
      "Some jurisdictions also use “caucus” for a nominating meeting that selects candidates or delegates; which meaning applies comes from the record you are reading.",
    relatedKeys: ["majority-leader", "minority-leader", "majority-whip"],
    authoring: {
      sourceNotes:
        "Both senses appear in the repository's recorded municipal and election data; the entry names both rather than collapsing them.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "sponsor",
    term: "Sponsor",
    shortDefinition:
      "The member who introduces a measure and is recorded as carrying it.",
    explanation:
      "Filing a measure puts a member's name on it. The sponsor of record is the member accountable for it: the one who answers for its contents in committee, decides whether to accept an amendment, and takes the credit or the blame for what it does. A measure has one sponsor of record, and staff work done in that member's office does not change whose measure it is.",
    relatedKeys: ["cosponsor", "committee-referral", "amendment", "docket"],
    authoring: {
      sourceNotes:
        "Written from the sponsor-of-record field the legislative domain already keeps and the docket already displays.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "cosponsor",
    term: "Cosponsor",
    shortDefinition:
      "A member who publicly adds their name to someone else's measure.",
    explanation:
      "Cosponsoring is support on the record before any vote is taken. It costs a member little and commits them to nothing procedurally, which is exactly why a long cosponsor list is used as evidence that a measure can pass. Adding a name does not transfer control of the measure; the sponsor of record still decides what happens to it.",
    relatedKeys: ["sponsor", "caucus", "roll-call"],
    authoring: {
      sourceNotes:
        "Written from the cosponsor relationships the legislative-politics module already models.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "docket",
    term: "Docket",
    shortDefinition: "The list of measures a body or an office has before it.",
    explanation:
      "A docket is the working list: what has been filed, where each item has reached, and what is waiting on somebody. It is an administrative record rather than a decision — an item's place on the docket says nothing about whether it will pass — but it is the record that tells a member what their week actually contains.",
    relatedKeys: ["committee-referral", "sponsor", "session"],
    authoring: {
      sourceNotes:
        "Written to describe the docket surface this game already presents in the office.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "first-reading",
    term: "First reading",
    shortDefinition:
      "The formal introduction of a measure, which starts its progress without debating it.",
    explanation:
      "The first reading is the announcement that a measure exists and is now before the body. Nothing is decided: it is the step that makes the measure official business and ordinarily sends it to committee. Requiring readings on separate occasions is what stops a body from writing and enacting something in a single afternoon.",
    contextNote:
      "How many readings a measure needs, and whether they may happen on the same day, comes from the body's own recorded rules.",
    relatedKeys: ["second-reading", "third-reading", "committee-referral"],
    authoring: {
      sourceNotes:
        "Written from the reading requirements the municipal ordinance procedure and legislature rule packs already record.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "second-reading",
    term: "Second reading",
    shortDefinition:
      "The stage where a measure is debated and usually where it can be amended.",
    explanation:
      "By the second reading the measure has been examined, ordinarily by a committee, and the body takes up what it has become. This is where the argument happens and where amendments are offered and disposed of, so the text that leaves second reading is often not the text that entered it.",
    contextNote:
      "How many readings a measure needs, and which one carries amendments, comes from the body's own recorded rules.",
    relatedKeys: ["first-reading", "third-reading", "amendment"],
    authoring: {
      sourceNotes:
        "Written from the reading requirements the municipal ordinance procedure and legislature rule packs already record.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "third-reading",
    term: "Third reading",
    shortDefinition:
      "The final stage in a chamber, where the measure as amended is passed or rejected.",
    explanation:
      "Third reading is the vote on the whole measure in its final form. Amendment is normally closed by then, so the question is the plain one: this text, yes or no. A measure that passes third reading has finished with that chamber and moves on; one that fails has finished altogether unless the body's rules allow it to be taken up again.",
    contextNote:
      "How many readings a measure needs comes from the body's own recorded rules.",
    relatedKeys: ["second-reading", "roll-call", "concurrence"],
    authoring: {
      sourceNotes:
        "Written from the third-reading requirements the legislature rule packs already record.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "amendment",
    term: "Amendment",
    shortDefinition:
      "A change to a measure's text, adopted by the body considering it.",
    explanation:
      "An amendment is offered, debated and voted on separately from the measure itself. Once adopted it becomes part of the text, which is why a bill's provisions can differ from what its sponsor filed. Amendments are used to improve a measure, to buy a vote, and sometimes to damage a measure by attaching something its supporters cannot accept.",
    relatedKeys: ["second-reading", "sponsor", "concurrence"],
    authoring: {
      sourceNotes:
        "Written from the amendment records the simulation already keeps; the docket reads a measure's current provisions, so adopted amendments are visible there.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "concurrence",
    term: "Concurrence",
    shortDefinition:
      "One chamber agreeing to the version of a measure the other chamber passed.",
    explanation:
      "In a two-chamber legislature both chambers must end up with the same text. When the second chamber amends a measure, the first is asked whether it concurs in those amendments. Concurring finishes the measure; refusing sends the two chambers into whatever reconciliation their rules provide, and a measure can die there with both chambers having voted for a version of it.",
    contextNote:
      "A single-chamber body has no concurrence stage, so it does not appear in those jurisdictions at all.",
    relatedKeys: ["amendment", "third-reading", "enrollment"],
    authoring: {
      sourceNotes:
        "Written from the two-chamber passage stages the legislative domain already models.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "enrollment",
    term: "Enrollment",
    shortDefinition:
      "Preparing the final agreed text of a passed measure for signature.",
    explanation:
      "Enrollment is clerical and consequential. Once both chambers have agreed, the measure is written up in its final form and certified as being what was actually passed. Nothing may be changed in substance at this point; the enrolled text is the thing that will be sent onward and, if it becomes law, the thing that will be read in court.",
    relatedKeys: ["concurrence", "presentment", "veto"],
    authoring: {
      sourceNotes:
        "Written from the enrollment stage the legislative domain already records between passage and presentment.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "presentment",
    term: "Presentment",
    shortDefinition:
      "Sending an enrolled measure to the executive for signature or veto.",
    explanation:
      "Presentment is the handover from the legislature to the executive, and it starts a clock: the executive has a limited period to sign, to veto, or in some jurisdictions to do nothing and let the measure take effect anyway. Because the period runs from presentment rather than from passage, when a measure is presented can matter as much as when it passed.",
    contextNote:
      "How long the executive has, and what silence means, differs by jurisdiction and is read from that jurisdiction's recorded rules.",
    relatedKeys: ["enrollment", "veto", "session"],
    authoring: {
      sourceNotes:
        "Written from the presentment stage and executive-action windows the constitutional-process source snapshots already capture.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "veto",
    term: "Veto",
    shortDefinition:
      "The executive's refusal to sign a measure, which stops it unless the legislature overrides.",
    explanation:
      "A veto returns the measure to the legislature, usually with the executive's objections. It is not necessarily the end: a legislature that can assemble the larger majority its rules require may override the veto and enact the measure anyway. The credible threat of a veto is therefore a bargaining position long before any measure is actually returned.",
    contextNote:
      "The override majority, and whether the executive may veto parts of a measure rather than all of it, come from the jurisdiction's own recorded rules.",
    relatedKeys: ["presentment", "enrollment", "appropriation"],
    authoring: {
      sourceNotes:
        "Written from the veto and override provisions in the repository's constitutional-process source snapshots.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "appropriation",
    term: "Appropriation",
    shortDefinition:
      "A legal authorization to spend a stated amount of public money for a stated purpose.",
    explanation:
      "Deciding that a program should exist and providing the money for it are two separate acts, and an appropriation is the second one. Without it, a program authorized in law has nothing to spend. An appropriation is bounded in amount, in purpose and usually in time, so money appropriated for one purpose cannot simply be moved to another.",
    relatedKeys: ["obligation", "fiscal-note", "veto"],
    authoring: {
      sourceNotes:
        "Written from the budget and appropriation structures the simulation's budget-economy module already models.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "obligation",
    term: "Obligation",
    shortDefinition:
      "A binding commitment to spend appropriated money, made before the money actually leaves.",
    explanation:
      "An obligation is the moment a government promises: the contract is signed, the order is placed, the grant is awarded. The cash may not move for months, but the appropriation is committed and can no longer be spent on anything else. This is why a budget can look unspent and be entirely used up, and why obligations rather than payments are what a careful reader watches.",
    relatedKeys: ["appropriation", "fiscal-note"],
    authoring: {
      sourceNotes:
        "Written from the obligation accounting the budget-economy module already keeps distinct from disbursement.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "fiscal-note",
    term: "Fiscal note",
    shortDefinition:
      "An estimate of what a measure would cost or raise, attached to it for the body to read.",
    explanation:
      "A fiscal note is prepared for a measure under consideration and states what it is expected to do to revenue and spending, usually over several years. It is an estimate with assumptions behind it, not a decision and not a fact: a contested fiscal note is itself often the argument, because a measure that looks affordable and one that does not are voted on differently.",
    relatedKeys: ["appropriation", "obligation", "committee-referral"],
    authoring: {
      sourceNotes:
        "Written from the bill-estimate action the office already offers, which produces an estimate with stated assumptions.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "session",
    term: "Session",
    shortDefinition:
      "The period during which a legislature is assembled and can do business.",
    explanation:
      "A legislature does not sit permanently. A session is the window in which it is assembled, and it has a beginning and an end fixed by the jurisdiction's rules; a regular session recurs on a schedule, while a special session is called for a stated purpose. Outside a session there is no body in place to file with, refer to or vote in, which is what makes a deadline near the end of one real.",
    contextNote:
      "The session window shown in this game is read from the jurisdiction's own recorded rules, including the outer limit on a regular session.",
    relatedKeys: ["adjournment", "docket", "presentment"],
    authoring: {
      sourceNotes:
        "Written from the regular-session window the legislative session module already computes from rule packs.",
      sourceUrls: [],
    },
  },
  {
    semanticKey: "adjournment",
    term: "Adjournment",
    shortDefinition:
      "Ending a sitting, either until a stated time or for the rest of the session.",
    explanation:
      "Adjourning closes the meeting. Adjourning to a named day is routine housekeeping; adjourning without a day, at the end of a session, is the act that kills everything still pending, because measures that have not finished have nowhere left to go. Adjournment is also a tactic: a body that adjourns while a measure is unfinished has decided about it without voting on it.",
    relatedKeys: ["session", "quorum", "presiding-officer"],
    authoring: {
      sourceNotes:
        "Written from the adjournment and session-limit records the legislature rule packs and municipal meeting practice already carry.",
      sourceUrls: [],
    },
  },
];

const BY_KEY: ReadonlyMap<string, GuideTermEntry> = new Map(
  GUIDE_TERMS.map((entry) => [entry.semanticKey, entry]),
);

/**
 * Exact whole-string lookup, for wrapping a label a surface already shows.
 *
 * Deliberately not a search over prose. A surface hands over one label it is
 * about to render — a seat title, a column heading — and gets an entry only
 * when that whole label is the term. Scanning player prose for words that
 * merely look institutional would attach explanations to somebody's surname.
 */
const BY_TERM: ReadonlyMap<string, GuideTermEntry> = new Map(
  GUIDE_TERMS.map((entry) => [entry.term.toLowerCase(), entry]),
);

export function guideTerm(semanticKey: string): GuideTermEntry | null {
  return BY_KEY.get(semanticKey) ?? null;
}

export function guideTermByLabel(label: string): GuideTermEntry | null {
  return BY_TERM.get(label.trim().toLowerCase()) ?? null;
}

export function relatedGuideTerms(
  entry: GuideTermEntry,
): readonly GuideTermEntry[] {
  return entry.relatedKeys
    .map((key) => BY_KEY.get(key))
    .filter((related): related is GuideTermEntry => related !== undefined);
}

export interface GuideSearchResult {
  readonly entry: GuideTermEntry;
  /** Why it matched, so the list can say so rather than look arbitrary. */
  readonly matched: "term" | "definition";
}

/**
 * The Guide's search, as a pure projection.
 *
 * An empty query is the whole catalog rather than nothing: the Guide opens as
 * something to browse. A term match sorts above a definition match, and a term
 * the query starts sorts above one it merely appears in, so typing "app" finds
 * Appropriation before the entries that happen to mention appropriated money.
 */
export function searchGuideTerms(
  query: string,
  entries: readonly GuideTermEntry[] = GUIDE_TERMS,
): readonly GuideSearchResult[] {
  const needle = query.trim().toLowerCase();
  const ranked: {
    readonly result: GuideSearchResult;
    readonly rank: number;
  }[] = [];
  for (const entry of entries) {
    const term = entry.term.toLowerCase();
    if (needle.length === 0) {
      ranked.push({ result: { entry, matched: "term" }, rank: 1 });
      continue;
    }
    if (term.startsWith(needle)) {
      ranked.push({ result: { entry, matched: "term" }, rank: 0 });
      continue;
    }
    if (term.includes(needle)) {
      ranked.push({ result: { entry, matched: "term" }, rank: 1 });
      continue;
    }
    const definition =
      `${entry.shortDefinition} ${entry.explanation} ${entry.contextNote ?? ""}`.toLowerCase();
    if (definition.includes(needle)) {
      ranked.push({ result: { entry, matched: "definition" }, rank: 2 });
    }
  }
  return ranked
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.result.entry.term.localeCompare(right.result.entry.term),
    )
    .map((row) => row.result);
}
