/** Entry point for the `release:*` package scripts. */
import { main, REPO_ROOT } from "./cli";

process.exitCode = main(process.argv.slice(2), REPO_ROOT);
