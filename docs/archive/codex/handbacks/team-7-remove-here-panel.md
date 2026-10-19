# Remove the room's duplicate people list

Before: the scene displayed a separate “Here” panel listing the people present.

After: the scene no longer mounts that panel. The existing meeting panel and scene-person interaction handlers remain unchanged.

## Evidence

The patch removes only the StorySceneDayPanel import and its sole mount from PlayerGame.tsx. It does not edit the saved roster, simulation time, character rendering or source artwork. The shared dirty checkout is preserved; the patch uses the recorded current-main source.

Prettier passed. Browser validation has not run because the available shared checkout differs from the patch's current-main baseline. This is a source candidate, not a verified runtime fix.

## Next action

Apply the candidate through the review lane and verify the home scene in the identified current runtime. The approved kids sources still need runtime integration. Pose and size repairs await Audit/Systems findings, as directed by the CTO.
