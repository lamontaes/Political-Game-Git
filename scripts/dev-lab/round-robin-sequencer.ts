import { BaseSequencer, type TestSpecification } from "vitest/node";

/**
 * Assigns test files to shards round-robin over the path-sorted list instead
 * of by path hash.
 *
 * Vitest's default shards by sha1 of the path, which is deterministic but
 * blind to cost: on the first hosted sharded run the heaviest suites
 * (governing-*, nationwide-*, the source replays) landed together and that
 * one shard passed its 45-minute cap while the others finished in six.
 * Expensive suites sit next to each other alphabetically, so dealing the
 * sorted list out one file per shard spreads each cluster across every
 * shard. Still deterministic, still a partition: `assert-unit-shard-union`
 * proves the shards cover the whole suite exactly once.
 */
export class RoundRobinSequencer extends BaseSequencer {
  override async shard(
    files: TestSpecification[],
  ): Promise<TestSpecification[]> {
    const { index, count } = this.ctx.config.shard ?? { index: 1, count: 1 };
    return [...files]
      .sort((a, b) =>
        a.moduleId < b.moduleId ? -1 : a.moduleId > b.moduleId ? 1 : 0,
      )
      .filter((_, position) => position % count === index - 1);
  }
}
