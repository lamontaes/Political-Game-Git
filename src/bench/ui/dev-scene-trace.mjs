/* global document */
// Dev mode's scene trace (src/bench/dev-views/scene-trace.ts), drawn in the Calendar sheet's dev
// panels: every scene type with the way dev mode can cause it, the scenes staged for the player with
// their cause and why each person is placed, and the register's tie class for every line a scene can
// say. Words are the view's labels; ids open in the shared Trace box where the page has one.

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function types({ labels, send }) {
  const { types: rows, unreachable } = await send("scene-trace/types");
  const box = el("details", undefined, "dev-scene-types");
  box.append(el("summary", `${labels.types} (${rows.length})`));
  if (unreachable.length)
    box.append(el("p", `${labels.unreachable}: ${unreachable.join(", ")}`));
  const list = el("ul");
  for (const row of rows) {
    const item = el(
      "li",
      `${row.key}: staged ${row.staged}${row.lastStaged ? `, last ${row.lastStaged}` : ""}${row.heldBack ? `, held back ${row.heldBack}` : ""}; lines ${row.lines}${row.unreached ? `, unreached ${row.unreached}` : ""}`,
    );
    if (row.forceable) {
      const button = el("button", labels.force);
      button.type = "button";
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const done = await send("scene-trace/force", { typeKey: row.key });
          // A recipe that could not run here says why; a staged scene names the record it came from.
          button.textContent = done.why
            ? labels.reasons[done.why]
            : done.staged === undefined
              ? labels.forced
              : `${labels.forced}; ${done.staged ? labels.stagedNow : labels.notStagedNow}${done.staged && done.causeRecords?.length ? `; ${labels.cause} ${done.causeRecords.join(", ")}` : ""}`;
        } catch (error) {
          button.textContent = error.message;
        }
      });
      item.append(" ", button);
      if (row.why) item.append(el("div", labels.reasons[row.why]));
      if (row.recipe === "legislature")
        item.append(el("div", labels.legislature));
    } else item.append(` (${labels.unreachable})`);
    const more = el("details");
    more.append(el("summary", labels.lines));
    more.addEventListener(
      "toggle",
      async () => {
        const lines = await send(
          `scene-trace/lines?type=${encodeURIComponent(row.key)}`,
        );
        const body = el("ul");
        for (const line of lines)
          body.append(
            el(
              "li",
              `${line.text} [${labels.ties[line.tie]}${line.requires.length ? `; ${labels.needs}: ${line.requires.join(", ")}` : ""}${line.reach === "unreached" ? `; ${labels.reach}: no` : ""}${line.held ? `; ${labels.heldByRule}` : ""}] ${line.key}`,
            ),
          );
        more.append(body);
      },
      { once: true },
    );
    item.append(more);
    list.append(item);
  }
  box.append(list);
  return box;
}

async function moments({ labels, send }) {
  const rows = await send("scene-trace/moments");
  const box = el("details", undefined, "dev-scene-moments");
  box.append(el("summary", `${labels.moments} (${rows.length})`));
  const list = el("ul");
  for (const row of rows) {
    const item = el(
      "li",
      `${row.date} ${row.outcome}${row.closed ? ` (${row.closed})` : ""}: ${labels.cause} ${row.cause ? `${row.cause.kind} ${row.cause.id}` : "none"}`,
    );
    for (const held of row.heldBack)
      item.append(
        el("div", `${labels.held}: ${held.typeKey} (${held.reason})`),
      );
    for (const scene of row.scenes) {
      item.append(
        el(
          "div",
          `${scene.typeKey}: ${labels.setting} ${scene.setting.kind} ${scene.setting.recordId}; ${labels.placed}: ${scene.placed.map((p) => `${p.name} (${p.why})`).join(", ")}`,
        ),
      );
    }
    list.append(item);
  }
  box.append(list);
  return box;
}

export const slots = {
  /** The Calendar sheet's dev panels, after Run, Scene and Campaign. */
  async calendar(context) {
    const box = el("section", undefined, "dev-scene-trace");
    box.append(el("h4", context.labels.title));
    box.append(await types(context), await moments(context));
    return box;
  },
};
