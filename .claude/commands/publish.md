# Publish Workflow to npm

Publish a new version of @turkelk/nestjs-cqrs-workflow to npm.

## Steps

1. Run `npm install` if `node_modules` is missing, then `npm run build` — stop if TypeScript errors.
2. Run `npm test` — stop if tests fail.
3. Check whether `@turkelk/nestjs-cqrs-kernel` needs a new release first:
   - Compare the local kernel's exports (in `../nestjs-cqrs-kernel/src/index.ts`) against what's published on npm (`npm view @turkelk/nestjs-cqrs-kernel exports`).
   - If the workflow package imports anything not yet published, publish a new kernel version first: build, test, `npm version`, commit, tag, push.
4. Ask the user what version to publish: patch, minor, or major (show current version from package.json).
5. Calculate the new version number based on their choice.
6. Run `npm version <patch|minor|major> --no-git-tag-version` to bump version.
7. Commit all pending changes (if any) with a descriptive message.
8. Create a git tag `v<new-version>` and push both the commit and the tag: `git push origin main && git push origin v<new-version>`.
9. Report the new version and confirm the GitHub Actions workflow will publish it.
