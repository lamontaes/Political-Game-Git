import { localRaces } from "../government";
import type { DevView } from "../dev-views";

/**
 * Dev mode's Election offers: for each office on the player's Elections page, whether the clerk
 * offers it to the player and, when not, the one reason (`playerFilingBar`) or the eligibility
 * rule that stops them, with the day they can file. It reads the page's own list
 * (`localRaces`), so what it shows is what the page offers (owner, Nov 16: dev mode shows why
 * each office is or is not offered).
 */
const view: DevView = {
  name: "election-offers",
  client: "election-offers.mjs",
  labels: {
    title: "Election offers",
    offered: "Offered",
    bar: "Why not",
    turnsOn: "Turns old enough",
    opens: "Filing opens",
    closes: "Filing closes",
    empty: "No local election is on the calendar",
    bars: {
      "not-your-office": "Not an office the player runs for",
      "not-your-town": "Does not serve the player's home",
      "window-not-open": "Filing not open yet",
      "window-closed": "Filing closed",
      "other-district": "Another district's seat",
      "filed-elsewhere": "Already filed for another race here",
      "at-large-elsewhere": "At-large race is filed once",
    },
  },
  routes: {
    "GET election-offers": ({ mode }) => {
      const { date, races } = localRaces(mode.core) as unknown as {
        date: string | null;
        races: {
          contestId: string;
          title: string;
          officeLevel: string;
          bar: string | null;
          cannotFile: { rule: string; metOn?: string } | null;
          filingOpens: string | null;
          filingDeadline: string;
        }[];
      };
      return {
        date,
        offers: races.map((race) => ({
          id: race.contestId,
          title: race.title,
          level: race.officeLevel,
          offered: race.bar === null && race.cannotFile === null,
          bar: race.bar,
          rule: race.cannotFile?.rule ?? null,
          metOn: race.cannotFile?.metOn ?? null,
          opens: race.filingOpens,
          closes: race.filingDeadline,
        })),
      };
    },
  },
};

export default view;
