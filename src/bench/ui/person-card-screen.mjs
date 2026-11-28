/* global URLSearchParams */
// Moved out of src/bench/play.mjs by scripts/screens/split-client.mjs: personCardNode takes the page's context first.
import {
  introText,
  peopleSentence,
  stripSection,
  perkList,
  dotRows,
  stripScreen,
} from "./strips.mjs";
import { dateWords } from "../../english/plain-words.mjs";
import { devModeOn } from "./dev-setting.mjs";
import { devMemorySection } from "./dev-memory.mjs";
import { devRecordsSection } from "./dev-records.mjs";
import { devPersonSection } from "./dev-person.mjs";
import { devViewNodes } from "./dev-views.mjs";

export async function personCardNode(
  ctx,
  person,
  stillWanted = () => true,
  openOther = (other) => ctx.showPerson(other),
) {
  const c = await ctx.api(
    `/api/known?${new URLSearchParams({ id: ctx.me.id, other: person.personId })}`,
  );
  await ctx.controlsReady;
  if (!stillWanted()) return null;
  const labels = ctx.controls.person;
  const known = c.publicKnowledge;
  const stance = ctx.voteWords();
  const pronoun = c.pronouns;
  const fill = (text) =>
    text.replace(/\{(\w+)\}/g, (_all, slot) => pronoun?.[slot] ?? "");
  const heading = (key, theyKey) =>
    pronoun ? fill(labels[key]) : labels[theyKey ?? key];
  const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  const role = [
    c.relation && capital(c.relation),
    known?.party,
    c.age !== null && c.age !== undefined ? `${labels.age} ${c.age}` : null,
  ]
    .filter((part) => part !== null && part !== undefined && part !== "")
    .join(" · ");
  const sharedLines = (c.shared ?? [])
    .filter((s) => labels.sharedWords?.[s.kind])
    .map((s) =>
      introText(
        s.name
          ? `${labels.sharedWords[s.kind]} · ${s.name}`
          : labels.sharedWords[s.kind],
      ),
    );
  // When you were last in touch and why, read from the tie's own record (the
  // card's tie row: its latestChange); an event only, never how close you are
  // (owner, Oct 29: no band word for how someone feels, on any screen); a
  // person with no tie to you has no line.
  const change = person.latestChange;
  const changeLine = change
    ? introText(
        [
          labels.lastInTouch,
          labels.tieCauses[change.cause],
          dateWords(change.date),
        ]
          .filter(Boolean)
          .join(" · "),
      )
    : null;
  if (changeLine) sharedLines.push(changeLine);
  // Their public record, from the past module's public tier: a fact the record does not hold is left out.
  const recordRows = known
    ? [
        ["since", ctx.dateOrValue(known.serviceStart)],
        ["votes", known.votesOnRecord],
        ["sponsored", known.lawsSponsored],
        ["signed", known.lawsSigned],
      ]
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => ({
          label: labels.publicRecord[key],
          value: String(value),
        }))
        .concat(
          known.positions.map((p) => ({
            label: ctx.policyLabel(p.question),
            value: p.position > 0 ? (stance.for ?? "") : (stance.against ?? ""),
          })),
        )
    : [];
  const people = peopleSentence(
    (c.colleagues ?? []).map((k) => ({
      name: k.name,
      relation: k.office,
      onOpen: () => openOther({ personId: k.personId }),
    })),
  );
  const firstColumn = [
    ...(c.summary?.length
      ? [
          stripSection(
            1,
            heading("whoIs", "whoAre"),
            introText(c.summary.join(" ")),
          ),
        ]
      : []),
    ...(c.traitLines?.length
      ? [
          stripSection(
            2,
            heading("howISee", "howISeeThem"),
            perkList(c.traitLines.map((t) => ({ name: t.label }))),
          ),
        ]
      : []),
    // Where they place themselves politically, once the player has learned it; until then the
    // card says so (the world still holds the real view).
    ...(c.view || c.viewUnknown
      ? [
          stripSection(
            2,
            ctx.controls.who.views,
            introText(
              c.view
                ? ctx.leanWord(c.view)
                : pronoun
                  ? fill(ctx.controls.who.viewUnknown)
                  : ctx.controls.who.viewUnknownThey,
            ),
            ...(c.viewAbout
              ? [
                  introText(
                    ctx.controls.who.viewAbout.replace("{about}", c.viewAbout),
                  ),
                ]
              : []),
          ),
        ]
      : []),
    ...(sharedLines.length
      ? [stripSection(5, labels.betweenUs, ...sharedLines)]
      : []),
    // Their life from the records, oldest first, as the card has told it since
    // #6772 and #7090: the card is sent the story and draws it (owner's
    // playtest, Nov 8).
    ...(c.history?.length
      ? [
          ctx.markLife(
            stripSection(
              5,
              capital(heading("lifeStory", "lifeStoryThey")),
              ...ctx.lifeParagraphs(c.history),
            ),
          ),
        ]
      : []),
  ];
  // Their life sits under the bust, in the bust's own column (owner on
  // People, Nov 16: "still lots of empty space"); with no bust it takes the
  // second column, beside who they are.
  const lifeAt = firstColumn.findIndex((node) => node.dataset?.life === "1");
  const life = lifeAt >= 0 ? firstColumn.splice(lifeAt, 1) : [];
  const underBust = c.face ? life : [];
  const secondColumn = [
    ...(c.face ? [] : life),
    ...(people
      ? [stripSection(3, capital(heading("herPeople", "theirPeople")), people)]
      : []),
    ...(recordRows.length
      ? [stripSection(4, labels.publicRecordTitle, dotRows(recordRows))]
      : []),
  ];
  // Dev mode: what they remember, a section only while dev mode is on.
  const memory = devModeOn()
    ? await devMemorySection({
        personId: person.personId,
        labels: ctx.controls.devMemory,
        dateOf: (iso) => dateWords(iso),
      })
    : null;
  if (memory) secondColumn.push(memory);
  if (devModeOn())
    secondColumn.push(
      await devRecordsSection({
        personId: person.personId,
        labels: ctx.controls.devRecords,
      }),
      await devPersonSection({
        personId: person.personId,
        labels: ctx.controls.devPerson,
        onDone: () => ctx.refresh(),
      }),
      // Views registered from their own files (ui/dev-views.mjs, slot "person").
      ...(await devViewNodes("person", {
        personId: person.personId,
        onDone: () => ctx.refresh(),
      })),
    );
  if (!stillWanted()) return null;
  return {
    name: c.name,
    node: stripScreen({
      name: c.name,
      role,
      nameBeside: true,
      // The approved card's bust stands as tall as its sections (pl-people).
      bustColumn: ctx.PERSON_CARD_BUST,
      underBust,
      face: c.face ?? null,
      columns: secondColumn.length
        ? [firstColumn, secondColumn]
        : [firstColumn],
    }),
  };
}
