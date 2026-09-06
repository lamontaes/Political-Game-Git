/**
 * The text seam this domain reads through.
 *
 * The normalizer itself now lives in the core, because the rights boundary
 * needs it: an enacted-text scope is a span of normalized text, and the
 * capability layer has to be able to cut that span before it hands any bytes to
 * a compiler. A normalizer the core could not run would leave the scope
 * enforceable only by the domain that declared it, which is not a boundary.
 */

export {
  containsExcerpt,
  normalizeRetrievedText,
} from "../../core/parse/html-text";
