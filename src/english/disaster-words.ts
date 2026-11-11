/**
 * A damaged home and the disaster that hit it as people say them in talk
 * (`data/english/disaster-words.json`): "the mobile home", "the tornado".
 */
import data from "../../data/english/disaster-words.json" with { type: "json" };

const HOMES = data.homes as Readonly<Record<string, string>>;
const DISASTERS = data.disasters as Readonly<Record<string, string>>;

/** The kind of home the housing engine records ("rowhouse"), as people say it, or null for a kind not named. */
export const homeSaid = (kind: string): string | null => HOMES[kind] ?? null;

/** FEMA's incident type ("Severe Storm"), as people say what happened ("the storm"), or null for one that is not said. */
export const disasterSaid = (incidentType: string): string | null =>
  DISASTERS[incidentType] ?? null;
