/**
 * Constants the bundler substitutes at build time.
 *
 * They are declared rather than imported because they are not a module: the
 * value is fixed into the bundle by `vite.config.ts`, which reads the accepted
 * version from `package.json` and the revision from the checkout itself.
 */
declare const __RELEASE_VERSION__: string;
declare const __BUILD_REVISION__: string;
declare const __BUILD_REVISION_SHORT__: string;
declare const __BUILD_DIRTY__: boolean;
