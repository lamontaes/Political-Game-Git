/**
 * A body as people say it, by the first of local-address.json's `bodyWords`
 * its recorded name holds ("Clark Fork City Council" is "the council"), else
 * its name's last word. One rule for a town's council, a county's board and
 * a state's legislature (its chambers' office kind, "legislature lower").
 */
import localData from "./data/local-address.json" with { type: "json" };
import { P } from "../core2/parameters";

const BODY_WORDS = (
  localData as unknown as {
    levels: { town: { heads: { bodyWords: readonly string[] } } };
  }
).levels.town.heads.bodyWords;

export function bodySaid(office: {
  readonly bodyName?: string | undefined;
}): string | null {
  const words = (office.bodyName ?? "")
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/\s+/)
    .filter(Boolean);
  const word =
    BODY_WORDS.find((row) => words.includes(row)) ?? words.at(-P.one);
  return word ? `the ${word}` : null;
}
