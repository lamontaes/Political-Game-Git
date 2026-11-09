/* global fetch */
// Dev mode on a bill's own page (mock fr-dev-bill): where to introduce it, how each member
// votes, the margin, then Introduce, Hold the vote, Sign, Veto or Override. Every press goes
// through the game's own routes (/api/dev/introduce, /api/dev/decide), which cast each member's
// vote and run the executive's decision as the game does. Control names and member names only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { lookRow } from "./look-row.mjs";
import { statusLine } from "./fields.mjs";
import { stripSection } from "./strips.mjs";

async function send(path, input) {
  const response = await fetch(`/api/dev/${path}`, {
    method: input ? "POST" : "GET",
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

/** The largest body whose members are listed to name each vote (layout, not a game rule). */
const NAMED_VOTES_UP_TO = 12;

/** The last result line, kept across the page's redraws (a press redraws the bill). */
let lastResult = { billId: null, text: "" };

/** A button lit while chosen. */
function lit(text, on, onClick) {
  const b = makeButton({ className: "action small", textContent: text });
  b.setAttribute("aria-pressed", String(on));
  b.addEventListener("click", () => onClick(b));
  return b;
}

/**
 * The section for one bill. `paper` is GET /api/bill (id, bodyOfficeId); `labels` is
 * controls.devBill; `onDone()` redraws the bill's page once the game has moved.
 */
export async function devBillCard({ paper, labels, onDone }) {
  const everyBody = await send("lawmaking-bodies");
  // The bodies of the bill's own place (a state's two chambers and its delegation, a county's
  // board) and the federal ones; the world's other places stay out of the row.
  const home = paper.bodyOfficeId ?? "";
  const place = home.slice(0, home.lastIndexOf(":") + 1);
  const bodies = everyBody.filter(
    (b) =>
      b.id.startsWith("federal:") ||
      (b.id.startsWith(place) && !/^us-(house|senate)$/.test(b.kind)),
  );
  if (!bodies.length) return null;
  let body = bodies.find((b) => b.id === home) ?? bodies[0];
  // Named votes by member key; a member not named votes with the margin.
  const named = new Map();
  let at = labels.margins.indexOf(labels.firstMargin);
  const result = statusLine();
  if (lastResult.billId === paper.id) result.textContent = lastResult.text;
  const bodyRow = el("div", { className: "acts" });
  const members = el("div", { className: "dev-bill-members" });
  const stepper = el("div");
  const drawBodies = () =>
    bodyRow.replaceChildren(
      ...bodies.map((b) => {
        const button = lit(b.name, b === body, () => {
          body = b;
          named.clear();
          drawBodies();
          drawMembers();
        });
        button.dataset.body = b.id;
        return button;
      }),
    );
  // A board's members are named one by one; a legislature of hundreds votes by the margin.
  const drawMembers = () =>
    members.replaceChildren(
      ...(body.members.length > NAMED_VOTES_UP_TO ? [] : body.members).map(
        (m) => {
          const row = el("div", { className: "dev-bill-member" });
          const draw = () => {
            const pair = ["yes", "no"].map((how) => {
              const b = lit(labels[how], named.get(m.key) === how, () => {
                named.set(m.key, named.get(m.key) === how ? undefined : how);
                if (!named.get(m.key)) named.delete(m.key);
                draw();
              });
              b.dataset.vote = how;
              return b;
            });
            row.replaceChildren(
              el("span", {
                className: "name",
                textContent: `${m.givenName} ${m.familyName}`,
              }),
              ...pair,
            );
          };
          draw();
          row.dataset.member = m.key;
          return row;
        },
      ),
    );
  const margin = () => labels.margins[at];
  const drawStepper = () => {
    const n = margin();
    const row = lookRow(
      {
        id: "margin",
        label: labels.passOrFail,
        value: (n >= 0 ? labels.passesBy : labels.failsBy).replace(
          "{n}",
          String(Math.abs(n)),
        ),
      },
      {
        onMove: (_id, by) => {
          at = Math.min(Math.max(at + by, 0), labels.margins.length - 1);
          drawStepper();
        },
        arrowLabel: (by) => (by < 0 ? labels.fewer : labels.more),
      },
    );
    row.dataset.testid = "dev-bill-margin";
    stepper.replaceChildren(row);
  };
  drawBodies();
  drawMembers();
  drawStepper();
  const act = (text, testid, work) => {
    const button = makeButton({ className: "action" }, text);
    button.dataset.testid = testid;
    button.addEventListener("click", async () => {
      button.disabled = true;
      result.textContent = "";
      try {
        result.textContent = await work();
        lastResult = { billId: paper.id, text: result.textContent };
        await onDone();
      } catch (error) {
        result.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
    return button;
  };
  // A decision: named members vote as named; the margin fills the rest.
  const decide = async (extra) => {
    const out = await send("decide", {
      billId: paper.id,
      margin: margin(),
      ...(named.size ? { votes: Object.fromEntries(named) } : {}),
      ...extra,
    });
    return [
      out.bill.number,
      out.bill.status,
      ...out.tallies.map((t) => `${t.yes}–${t.no}`),
    ].join(" · ");
  };
  const buttons = [
    act(labels.introduce, "dev-bill-introduce", async () => {
      const { bill } = await send("introduce", {
        billId: paper.id,
        bodyOfficeId: body.id,
      });
      return [bill.number, bill.status].join(" · ");
    }),
    act(labels.hold, "dev-bill-hold", () => decide({})),
    act(labels.sign, "dev-bill-sign", () => decide({ sign: true })),
    act(labels.veto, "dev-bill-veto", () => decide({ sign: false })),
    act(labels.override, "dev-bill-override", () =>
      decide({ sign: false, overrideMargin: Math.abs(margin()) }),
    ),
  ];
  const section = stripSection(
    9,
    labels.title,
    el("h4", { className: "label", textContent: labels.introduceAt }),
    bodyRow,
    ...(bodies.some((b) => b.members.length <= NAMED_VOTES_UP_TO)
      ? [el("h4", { className: "label", textContent: labels.members }), members]
      : []),
    stepper,
    el("div", { className: "acts" }, ...buttons),
    result,
  );
  section.classList.add("dev-only", "dev-bill-card");
  return section;
}
