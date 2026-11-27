/** The literal constants of housing-construction.ts, kept in a file that imports nothing so a file that only needs the name never loads the module (map row 1, the load-order failures). */
/** The policy keys the builders' decision reads, and the law row each was governed by this month. */
export const CONSTRUCTION_LAW_KEYS = {
  multifamily:
    "us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones",
  inclusionary: "us-policy-positions:housing-land-use.inclusionary-requirement",
  allElectric: "us-policy-positions:environment-energy.ban-new-gas-hookups",
  farmland:
    "us-policy-positions:agriculture-natural-resources.protect-farmland-from-development",
} as const;
