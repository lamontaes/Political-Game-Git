/**
 * Dev mode's Printed stories, on the Calendar (owner, Nov 16: what a thread traces by script, dev
 * mode traces in the game): the stories the town's outlets printed, newest first, each id opening
 * dev mode's Trace, so a printed police log opens to how its month stood against the town's usual,
 * the space the paper gave it and who it happened to (dev-trace.ts). Registered from its own file
 * (dev-views.ts). It reads the news engine's stories; it writes nothing and spends no time.
 */
import { coreAPI } from "../../core2/state";
import type { DevView } from "../dev-views";

/** How many printed stories the panel lists, newest first. Engineering value. */
const SHOWN = 40;

interface Printed {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  readonly placeId?: string;
  readonly outletId?: string;
  readonly facts?: Readonly<Record<string, unknown>>;
}

const view: DevView = {
  name: "printed-stories",
  client: "dev-printed-stories.mjs",
  labels: {
    title: "Printed stories",
    date: "Date",
    record: "Record",
    source: "From",
    trace: "Trace",
  },
  routes: {
    "GET printed-stories": ({ mode }) => {
      if (!mode.core.modules.has("news")) return [];
      const rows = coreAPI(mode.core)
        .moduleState("news")
        .table("stories")
        .rows() as unknown as Printed[];
      return rows
        .filter(
          (row) => row.kind === "press.printed" && row.placeId === mode.placeId,
        )
        .sort(
          (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
        )
        .slice(0, SHOWN)
        .map((row) => ({
          id: row.id,
          date: row.date,
          source: String(row.facts?.sourceRecordId ?? ""),
        }));
    },
  },
};

export default view;
