/**
 * Who a candidate id names (shared by voting, campaigns and the press, so a
 * state or federal candidate who isn't a full person yet still has a name).
 */
import type { CoreAPI } from "./types";
import { drawOfficialIdentity } from "./officials-identity";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";

/**
 * Who a candidate id names, for any kind of candidate: a resident (their own
 * record), a seated official (`official:term:…`, their term's identity), or a
 * drawn challenger or nominee (`official:challenger:…`, `official:nominee:…`,
 * the same identity a win would seat). Record fields only; the words come
 * from the English engine.
 */
export function candidateIdentity(
  api: CoreAPI,
  candidateId: string,
): {
  readonly givenName: string;
  readonly familyName: string;
  readonly birthDate: string;
  readonly kind: "resident" | "official" | "drawn";
} | null {
  const person = api.state.people.get(candidateId);
  if (person)
    return {
      givenName: person.givenName,
      familyName: person.familyName,
      birthDate: person.birthDate,
      kind: "resident",
    };
  if (!candidateId.startsWith("official:")) return null;
  const key = candidateId.slice("official:".length);
  const term = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .get(key) as unknown as TermRow | undefined;
  if (term)
    return {
      givenName: term.identity.givenName,
      familyName: term.identity.familyName,
      birthDate: term.identity.birthDate,
      kind: "official",
    };
  const loaded = api
    .moduleState(OFFICES_MODULE_ID)
    .table("loaded")
    .get("town") as unknown as { worldSeed: string } | undefined;
  if (!loaded) return null;
  const drawn = drawOfficialIdentity({
    worldSeed: loaded.worldSeed,
    seatKey: candidateId,
    stateUsps: (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("town")
        .get("town") as unknown as {
        stateKey: string;
      }
    ).stateKey.slice(3),
    role: "state-executive-challenger",
    referenceDate: api.state.date,
  });
  return {
    givenName: drawn.givenName,
    familyName: drawn.familyName,
    birthDate: drawn.birthDate,
    kind: "drawn",
  };
}
