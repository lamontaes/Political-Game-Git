// The one person card (play-one-person-shows-two-faces): every place a screen
// shows a person by face and name builds it here, from the one face record the
// server gives for that person (scene.ts faceOf), drawn by the one face part
// (face.mjs). Each layout is a mock's arrangement of the same parts; none
// draws a face its own way. Never a mark for how someone feels about you
// (owner, Oct 29: no scale of what someone thinks of you); no letter in a
// circle (owner, Nov 8).
import { el } from "./dom.mjs";
import { makeButton, buttonRow } from "./button.mjs";
import { face as drawFace } from "./face.mjs";
import { partyClass } from "./map.mjs";
import { stripSection, nameLink } from "./strips.mjs";

/**
 * `person`: { name, face, party?, line?, onOpen?, more? }. `line` is a seat,
 * post or role in words (or a node a screen drew: a post underlined as a Guide
 * term). `more` are nodes under the card (a candidate's stances).
 *
 * Layouts:
 * - `member` (default): a round face, the name and the line under it, a
 *   control that opens their card, the party in its color; `large` is the
 *   executive's card (the mock's Mayor).
 * - `leader`: a bust at the left, the name big beside it, `party · line`
 *   under it, then `note` (the mock's mayor and governor).
 * - `section`: a strip section headed `heading` (the name where none),
 *   holding a bust, then the name and line when a heading is given, then
 *   `more` and `actions` as a row of buttons (Play as).
 * - `saved`: a saved life, its own strip screen: the name over a bust,
 *   `note` (the game's date) and `actions` (Load).
 */
export function personCard(
  person,
  {
    layout = "member",
    large = false,
    heading,
    note,
    actions = [],
    column,
  } = {},
) {
  if (layout === "leader") return leaderCard(person, note);
  if (layout === "section")
    return sectionCard(person, { heading, actions, column });
  if (layout === "saved")
    return el(
      "div",
      { className: "strip-screen strip-wrap strips ol-g saves-row" },
      sectionCard(
        {
          ...person,
          more: [el("p", { className: "save-date", textContent: note })],
        },
        { actions, column },
      ),
    );
  const card = memberLayout(person, large);
  return person.more
    ? el("div", { className: "candidate" }, card, ...person.more)
    : card;
}

function lineNode(line, className) {
  if (!line) return [];
  return [
    typeof line === "string"
      ? el("span", { className, textContent: line })
      : el("span", { className }, line),
  ];
}

function memberLayout(person, large) {
  const face = drawFace(person.face);
  face.classList.add("member-face");
  const card = makeButton(
    {
      className: `member-card ${partyClass(person.party)}${large ? " large" : ""}`,
      title: [
        person.name,
        person.party,
        typeof person.line === "string"
          ? person.line
          : person.line?.textContent,
      ]
        .filter(Boolean)
        .join(", "),
    },
    face,
    el(
      "span",
      { className: "member-text" },
      el("span", { className: "member-name", textContent: person.name }),
      ...lineNode(person.line, "member-line"),
    ),
  );
  if (person.onOpen) card.addEventListener("click", person.onOpen);
  return card;
}

function leaderCard(person, note) {
  const nameNode = nameLink(person.name, person.onOpen);
  nameNode.className = "leader-name pick";
  return el(
    "div",
    { className: "leader" },
    drawFace(person.face, { shape: "bust", alt: person.name, column: 200 }),
    el(
      "div",
      { className: "leader-text" },
      nameNode,
      el(
        "p",
        { className: "leader-post" },
        ...(person.party
          ? [
              el("span", {
                className: "leader-party",
                textContent: person.party,
              }),
              " · ",
            ]
          : []),
        person.line ?? "",
      ),
      ...(note ? [el("p", { className: "intro", textContent: note })] : []),
    ),
  );
}

function sectionCard(person, { heading, actions, column }) {
  return stripSection(
    1,
    heading ?? person.name,
    drawFace(person.face, { shape: "bust", alt: person.name, column }),
    ...(heading
      ? [
          el("h2", { className: "strip-name", textContent: person.name }),
          ...(person.line
            ? [
                el("p", {
                  className: "strip-role",
                  textContent: person.line,
                }),
              ]
            : []),
        ]
      : []),
    ...(person.more ?? []),
    ...(actions.length ? [buttonRow(...actions)] : []),
  );
}
