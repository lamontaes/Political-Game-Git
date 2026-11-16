/* global fetch */
// Dev mode's views from their own files (src/bench/dev-views.ts): each view's page part is a
// module in src/bench/ui/ that exports `slots`, an object of functions by slot name. A screen that
// holds a slot calls devViewNodes(slot, context) and adds what comes back; a view draws in a slot
// by naming it, without editing the screen. Each slot function gets the context plus its view's
// `labels` and `send(path, input)`, which calls /api/dev/<path> (POST when input is given), and
// returns a node, a list of nodes or nothing. The slots held today:
//   "bill-card": the end of dev mode's bill card; context { billId, onDone }.
//   "panels": the Government tab's dev panels row, beside Bills and Bribe; context { billId, onDone }.
//   "metrics": under the Metrics tab's board, in a dev panels row; context { refresh }.
//   "calendar": the Calendar sheet's dev panels, after Run, Scene and Campaign; context { onDone }.
// A new slot is one devViewNodes call on its screen and one line here.

async function send(path, input) {
  const response = await fetch(`/api/dev/${path}`, {
    method: input ? "POST" : "GET",
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

/** The registered views, asked for once a page load: they are fixed when the bench starts. */
let listed = null;

/**
 * The nodes the registered views draw in one slot, in the views' order (by file name).
 * `options` lets a test give the list and the loader; the page uses the bench's.
 */
export async function devViewNodes(slot, context = {}, options = {}) {
  const views = options.views ?? (listed ??= send("views"));
  const load = options.load ?? ((file) => import(`/ui/${file}`));
  const nodes = [];
  for (const view of await views) {
    const part = await load(view.client);
    const draw = part.slots?.[slot];
    if (!draw) continue;
    const drawn = await draw({ ...context, labels: view.labels, send });
    if (drawn) nodes.push(...(Array.isArray(drawn) ? drawn : [drawn]));
  }
  return nodes;
}
