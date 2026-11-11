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
export async function devBillCard({
  paper,
  labels,
  onDone,
  onTrace,
  traceLabel,
}) {
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
  // The chair of each committee is cast to hear the bill (the game's own hearing decision), so a
  // forced vote is not stopped by a chair who would hold it unheard.
  let chairHears = false;
  const chairButton = lit(labels.chairHears, chairHears, (b) => {
    chairHears = !chairHears;
    b.setAttribute("aria-pressed", String(chairHears));
  });
  chairButton.dataset.testid = "dev-bill-chair-hears";
  // A decision: named members vote as named; the margin fills the rest.
  const decide = async (extra) => {
    const out = await send("decide", {
      billId: paper.id,
      margin: margin(),
      ...(named.size ? { votes: Object.fromEntries(named) } : {}),
      ...(chairHears ? { chairHears: true } : {}),
      ...extra,
    });
    return [
      out.bill.number,
      out.bill.status,
      ...out.tallies.map((t) => `${t.yes}–${t.no}`),
    ].join(" · ");
  };
  // Trace: where the vote went and why, on its own screen (ui/dev-trace-vote.mjs).
  const traceButton = makeButton({ className: "action" }, traceLabel);
  traceButton.dataset.testid = "dev-bill-trace";
  traceButton.addEventListener("click", () => onTrace());
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
    traceButton,
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
    el("div", { className: "acts" }, chairButton),
    el("div", { className: "acts" }, ...buttons),
    result,
    ...(await outcomeLines({ billId: paper.id, labels, onDone })),
    ...twinLines(labels),
  );
  section.classList.add("dev-only", "dev-bill-card");
  return section;
}

const dollars = (minor) =>
  `${minor < 0 ? "-" : ""}$${Math.round(Math.abs(minor) / 100).toLocaleString("en-US")}`;
const fill = (text, values) =>
  text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

/**
 * The money check: a button that builds the same world left alone, runs it to today and lists the
 * cash in both by who holds it, then the holders whose cash moved most. Control names and record
 * data only.
 */
function twinLines(labels) {
  const t = labels.twin;
  const box = el("div", { className: "dev-twin" });
  const run = makeButton({ className: "action" }, t.run);
  run.dataset.testid = "dev-twin-run";
  const line = (text, testid) => {
    const p = el("p", { className: "dev-bill-line", textContent: text });
    if (testid) p.dataset.testid = testid;
    return p;
  };
  run.addEventListener("click", async () => {
    run.disabled = true;
    box.replaceChildren(line(t.running));
    try {
      const out = await send("twin-money", {});
      box.replaceChildren(
        line(
          [
            t.span.replace("{from}", out.from).replace("{to}", out.to),
            out.changes.length
              ? `${t.done}: ${out.changes.map((c) => `${c.control} ${c.count}`).join(", ")}`
              : t.nothing,
          ].join(" · "),
          "dev-twin-span",
        ),
        ...out.classes.map((row) => {
          const p = line(
            [
              t.classes[row.key] ?? row.key,
              `${t.here} ${dollars(row.hereMinor)}`,
              `${t.twin} ${dollars(row.twinMinor)}`,
              `${t.difference} ${dollars(row.diffMinor)}`,
            ].join(" · "),
            "dev-twin-class",
          );
          p.dataset.class = row.key;
          return p;
        }),
        el("h4", {
          className: "label",
          textContent: t.holders.replace("{n}", String(out.holdersMoved)),
        }),
        ...out.holders.map((row) =>
          line(
            [
              row.name,
              t.classes[row.class] ?? row.class,
              `${t.difference} ${dollars(row.diffMinor)}`,
            ].join(" · "),
            "dev-twin-holder",
          ),
        ),
      );
    } catch (error) {
      box.replaceChildren(line(error.message));
    } finally {
      run.disabled = false;
    }
  });
  return [
    el("h4", { className: "label", textContent: t.title }),
    el("div", { className: "acts" }, run),
    box,
  ];
}

/** How a bill ended, in the labels' words, from the legislature's own ending record. */
export function endingText(labels, outcome) {
  const e = outcome.ending;
  const names = outcome.endingNames;
  const key =
    e.how === "committee-held" && e.discharge
      ? "committee-held-petition"
      : e.how === "vetoed" && e.override
        ? "vetoed-override"
        : e.how;
  return fill(labels.endings[key] ?? e.how, {
    ...e,
    chamber: names.chamber || e.chamber,
    chair: names.chair || e.chairId,
    position: e.chairPosition,
    trait: e.chairTrait,
    signed: e.discharge?.signed,
    needed: e.discharge?.needed ?? e.needed,
    reasons: (e.reasons ?? []).map((r) => r.reason).join(", "),
    tallies: (e.override ?? [])
      .map((t) => `${t.yes} of ${t.needed}`)
      .join(", "),
  });
}

/**
 * What came of the bill: how it ended and why, the sections a trade added, and each law row it
 * made with who that law reached (the core's one reach reader), in counts and dollars. A law not
 * yet in force can be run to its effective date. Record data and control names only.
 */
async function outcomeLines({ billId, labels, onDone }) {
  let outcome;
  try {
    outcome = await send(`bill-outcome?billId=${encodeURIComponent(billId)}`);
  } catch {
    return [];
  }
  const line = (text, testid) => {
    const p = el("p", { className: "dev-bill-line", textContent: text });
    if (testid) p.dataset.testid = testid;
    return p;
  };
  const out = [
    el("h4", { className: "label", textContent: labels.outcome }),
    line(endingText(labels, outcome), "dev-bill-ending"),
    line(
      labels.addedSections.replace("{n}", String(outcome.addedSections)),
      "dev-bill-added-sections",
    ),
  ];
  if (outcome.ending.how === "law" && !outcome.laws.length)
    out.push(line(labels.noLaw));
  for (const law of outcome.laws) {
    const r = law.reach;
    out.push(
      line(
        [
          law.series,
          law.level,
          `${law.value}${law.unit ? ` ${law.unit}` : ""}`,
          law.inForce
            ? labels.inForce
            : labels.notYetInForce.replace("{date}", law.effectiveDate),
        ].join(" · "),
        "dev-bill-law",
      ),
    );
    if (!law.inForce) {
      const run = makeButton({ className: "action small" }, labels.runToEffect);
      run.dataset.testid = "dev-bill-run-to-effect";
      run.addEventListener("click", async () => {
        run.disabled = true;
        try {
          await send("run-until", {
            event: "law-takes-effect",
            subject: law.id,
            cap: 800,
          });
          await onDone();
        } finally {
          run.disabled = false;
        }
      });
      out.push(el("div", { className: "acts" }, run));
    }
    out.push(el("h4", { className: "label", textContent: labels.reach.title }));
    if (!r.records) {
      out.push(line(labels.reach.none, "dev-bill-reach-none"));
      continue;
    }
    out.push(
      line(
        [
          `${labels.reach.records} ${r.records}`,
          `${labels.reach.fullPeople} ${r.fullPeople} (${labels.reach.inTown} ${r.fullPeopleInTown}, ${labels.reach.elsewhere} ${r.fullPeopleElsewhere})`,
          `${labels.reach.counted} ${Math.round(r.counted)}`,
          `${labels.reach.organizations} ${r.organizations}`,
          `${labels.reach.governments} ${r.governments}`,
          `${labels.reach.money} ${dollars(r.amountMinor)} (${labels.reach.inTown} ${dollars(r.amountInTownMinor)}, ${labels.reach.elsewhere} ${dollars(r.amountElsewhereMinor)})`,
        ].join(" · "),
        "dev-bill-reach",
      ),
      ...r.by.map((side) =>
        line(
          [
            side.engine,
            side.what,
            `${labels.reach.records} ${side.records}`,
            `${labels.reach.fullPeople} ${side.fullPeople}`,
            `${labels.reach.counted} ${Math.round(side.counted)}`,
            dollars(side.amountMinor),
          ].join(" · "),
          "dev-bill-reach-side",
        ),
      ),
      ...r.named.map((person) =>
        line(
          [
            person.name,
            person.inTown ? labels.reach.inTown : labels.reach.elsewhere,
            person.what,
            dollars(person.amountMinor),
          ].join(" · "),
          "dev-bill-reach-person",
        ),
      ),
    );
  }
  return out;
}
