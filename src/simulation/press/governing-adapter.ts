/**
 * What the press domain asks of GOVERNING (CRUNCH47 B2, the composed source).
 *
 * This file used to hold two stand-ins, written so the press lane could be
 * built before the office lane existed: an authority reader that answered for
 * two researched procedures and `unknown` for everything else, and a payment
 * writer that refused outright. Both are gone. The real writers are here, and
 * the press domain reaches them through this one seam, so there remains a
 * single place where the two lanes meet.
 *
 * The contract is unchanged in both directions:
 *
 * - An authority answer names a possible procedure and its source. It is never
 *   a finding, never guilt and never a sanction; `unknown` still means nothing
 *   happens, not permission.
 * - Public money moves only through GOVERNING's own labelled writer, once per
 *   appropriation and operation, and only where the payer actually has access
 *   to that account. The press domain records what happened; it never moves
 *   money itself.
 */

export {
  canInstitutionAct,
  INSTITUTION_AUTHORITY_VERSION,
} from "../governing/institution-authority";
export type {
  AccountableInstitution,
  InstitutionAction,
  InstitutionActionAnswer,
} from "../governing/institution-authority";
export {
  OUTSIDE_MANDATE_EVENT,
  OUTSIDE_MANDATE_TAG,
  outsideMandatePayments,
  recordOutsideMandatePublicPayment,
} from "../governing/outside-mandate-payment";
export type {
  OutsideMandatePaymentInput,
  OutsideMandatePaymentResult,
} from "../governing/outside-mandate-payment";

/**
 * Public-fund misuse is reachable now that GOVERNING's writer exists. It still
 * needs a real appropriation and a payer with access to that account, which
 * the writer itself checks and refuses with the reason.
 */
export function outsideMandatePublicPaymentAvailable(): boolean {
  return true;
}
