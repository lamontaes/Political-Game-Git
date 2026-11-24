// Dev mode's Budget bill panel (src/bench/dev-views/budget-line.ts), in the Government tab's dev
// panels row: pick a body, one spending line of its government's budget in force, a change a year
// in dollars, and Introduce. The bill goes through dev mode's own `introduce` (line, deltaMinor),
// sponsored by the body's first member; the Bills panel then passes or defeats it.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { select, numberBox, statusLine } from "./fields.mjs";

const money = (minor) => `$${Math.round(minor / 100).toLocaleString("en-US")}`;

export const slots = {
  panels: async ({ labels, send, onDone }) => {
    const bodies = await send("lawmaking-bodies");
    if (!bodies.length) return null;
    const bodyBox = select({
      label: labels.body,
      value: bodies[0].id,
      options: bodies.map((b) => ({
        value: b.id,
        label: `${b.name} · ${b.level ?? ""}`,
      })),
    });
    const lineBox = select({ label: labels.line, value: "", options: [] });
    const change = numberBox({
      value: 100000,
      step: "any",
      label: labels.change,
    });
    const result = statusLine();
    const introduce = makeButton({ className: "action" }, labels.introduce);
    introduce.dataset.testid = "dev-budget-introduce";
    const fillLines = async () => {
      const { lines } = await send(
        `budget-lines?bodyOfficeId=${encodeURIComponent(bodyBox.value)}`,
      );
      lineBox.replaceChildren(
        ...lines.map((row) =>
          el("option", {
            value: row.line,
            textContent: `${row.line} · ${labels.now} ${money(row.spendingMinor)}`,
          }),
        ),
      );
      introduce.disabled = !lines.length;
      result.textContent = lines.length ? "" : labels.noLines;
    };
    bodyBox.addEventListener("change", fillLines);
    await fillLines();
    introduce.addEventListener("click", async () => {
      introduce.disabled = true;
      try {
        const body = bodies.find((b) => b.id === bodyBox.value);
        const { bill } = await send("introduce", {
          bodyOfficeId: bodyBox.value,
          sponsorId: body.members[0]?.key,
          line: lineBox.value,
          deltaMinor: Math.round(Number(change.value) * 100),
        });
        result.textContent = [bill.number, bill.status, bill.id].join(" · ");
        await onDone?.();
      } catch (error) {
        result.textContent = error.message;
      } finally {
        introduce.disabled = false;
      }
    });
    return el(
      "section",
      { className: "dev-only dev-budget-line" },
      el("h3", { textContent: labels.title }),
      bodyBox,
      lineBox,
      change,
      introduce,
      result,
    );
  },
};
