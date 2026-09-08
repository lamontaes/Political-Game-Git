/**
 * Errors the source substrate raises.
 *
 * Every one of these is thrown rather than returned. A violated source
 * invariant means the compiler that called it is wrong about the world, and a
 * wrong compiler must stop rather than emit a record nobody can trust.
 */

/** Base class so a caller can distinguish substrate refusals from bugs. */
export class SourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A `Sourced<T>` constructor was handed something its state cannot mean. */
export class SourceValueError extends SourceError {}

/** A provenance record does not describe evidence the substrate can accept. */
export class SourceProvenanceError extends SourceError {}

/** Bytes were opened as production or fixture input and refused. */
export class SourceCapabilityError extends SourceError {}

/** A corpus failed schema, algebra, oracle or coverage validation. */
export class SourceValidationError extends SourceError {}

/** Raw bytes could not be read as the format they were declared to be. */
export class SourceParseError extends SourceError {}
