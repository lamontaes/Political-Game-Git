// The party's class: a party's name as a class the stylesheet colors.


/** A party's name as a class the stylesheet colors ("Democratic" → "party-democratic"). */
export function partyClass(party) {
  const slug = String(party ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `party-${slug}` : "party-none";
}
