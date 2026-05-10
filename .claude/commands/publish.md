# Publish Workflow to npm

Publish a new version of @turkelk/nestjs-cqrs-workflow to npm.

## Steps

1. Run `npm run build` — stop if TypeScript errors.
2. Run `npm test` — stop if tests fail.
3. Ask the user what version to publish: patch, minor, or major (show current version from package.json).
4. Calculate the new version number based on their choice.
5. Commit all pending changes (if any) with a descriptive message.
6. Create a git tag `v<new-version>` and push both the commit and the tag: `git push origin main && git push origin v<new-version>`.
7. Report the new version and confirm the GitHub Actions workflow will publish it.
