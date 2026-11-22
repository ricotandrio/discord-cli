# Release Process

This document describes how to create releases for discord-cli.

## Prerequisites

- All tests must pass: `npm test`
- Clean working tree (no uncommitted changes)
- `package.json` and `package-lock.json` must have matching versions

## Release Steps

### 1. Update Version

Update the version in `package.json`:

```bash
npm install  # Syncs package-lock.json
```

### 2. Validate Before Tagging

Run the pre-tag validation script:

```bash
npm run tag
```

This checks:
- `package.json` and `package-lock.json` versions match
- Files are committed (not staged or uncommitted)
- Tag doesn't already exist

### 3. Create and Push Tag

```bash
# Create tag from package.json version
git tag v$(node -p "require('./package.json').version")

# Push tag to trigger CI release
git push origin v$(node -p "require('./package.json').version")
```

### 4. Verify Release

The GitHub Actions workflow will:
1. Run tests
2. Build the package
3. Create a GitHub release with the packed `.tgz` file

Check the [Actions tab](https://github.com/ricotandrio/discord-cli/actions) for status.

## Husky Hooks

Husky is configured with:

- **pre-commit**: Runs typecheck before allowing commits
- **pre-tag-check script**: Validates package versions before tagging

## Manual Validation

To manually check readiness for release:

```bash
# Run all validations
./scripts/pre-tag-check.sh

# Or use npm script
npm run tag
```

## Troubleshooting

### "package-lock.json not found"

Run `npm install` to generate it.

### "Version mismatch"

`package.json` and `package-lock.json` versions don't match. Run:

```bash
npm install
```

### "Tag already exists"

Choose a different version or delete the tag:

```bash
git tag -d v0.0.2-beta
git push origin :refs/tags/v0.0.2-beta
```

### "Uncommitted changes"

Commit `package.json` and `package-lock.json`:

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to x.x.x"
```
