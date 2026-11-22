#!/usr/bin/env bash
# create-tag.sh - Safely create and push a git tag after validation
# Usage: ./scripts/create-tag.sh [patch|minor|major|beta|alpha|<version>]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$REPO_ROOT"

# Run pre-check first
echo "Running pre-tag validation..."
"$SCRIPT_DIR/pre-tag-check.sh"

# If we get here, we're ready to tag
PKG_VERSION=$(node -p "require('./package.json').version")
TAG_NAME="v$PKG_VERSION"

echo ""
echo "Creating tag: $TAG_NAME"
git tag "$TAG_NAME"

echo ""
echo "Tag created locally. Push with:"
echo "  git push origin $TAG_NAME"
echo ""
read -p "Push now? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin "$TAG_NAME"
    echo "Tag pushed!"
fi
