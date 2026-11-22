#!/usr/bin/env bash
# pre-tag-check.sh - Prevent tagging if package.json and package-lock.json versions don't match
# Usage: Run this before creating a tag

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get version from package.json
PKG_VERSION=$(node -p "require('./package.json').version")

# Check if package-lock.json exists
if [[ ! -f "package-lock.json" ]]; then
    echo -e "${RED}Error: package-lock.json not found${NC}"
    echo "Run 'npm install' to generate it"
    exit 1
fi

# Get version from package-lock.json
LOCK_VERSION=$(node -p "require('./package-lock.json').version")

# Compare versions
if [[ "$PKG_VERSION" != "$LOCK_VERSION" ]]; then
    echo -e "${RED}Error: Version mismatch!${NC}"
    echo -e "  package.json:        ${YELLOW}$PKG_VERSION${NC}"
    echo -e "  package-lock.json:   ${YELLOW}$LOCK_VERSION${NC}"
    echo ""
    echo "Run 'npm install' to sync package-lock.json with package.json"
    exit 1
fi

# Check if version is staged/committed
TAG_NAME="v$PKG_VERSION"
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [[ "$LATEST_TAG" == "$TAG_NAME" ]]; then
    echo -e "${RED}Error: Tag ${TAG_NAME} already exists${NC}"
    exit 1
fi

# Check if package.json and package-lock.json are committed
PKG_COMMITED=$(git log -1 --format="%H" -- package.json package-lock.json 2>/dev/null || echo "")
HEAD_COMMIT=$(git rev-parse HEAD)

if [[ "$PKG_COMMITED" != "$HEAD_COMMIT" ]]; then
    # Check if there are unstaged changes
    if git diff --quiet package.json package-lock.json && git diff --cached --quiet package.json package-lock.json; then
        # Files are committed but not in HEAD commit - check if they're behind HEAD
        echo -e "${YELLOW}Warning: package.json and/or package-lock.json were last modified in a different commit${NC}"
        echo "  Last change: $PKG_COMMITED"
        echo "  HEAD:        $HEAD_COMMIT"
    else
        echo -e "${RED}Error: package.json and/or package-lock.json have uncommitted changes${NC}"
        echo "Commit them first with:"
        echo "  git add package.json package-lock.json"
        echo "  git commit -m 'chore: bump version to $PKG_VERSION'"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Ready to tag${NC}"
echo -e "  Version: ${GREEN}$PKG_VERSION${NC}"
echo -e "  Tag:     ${GREEN}$TAG_NAME${NC}"
echo ""
echo "Run: git tag $TAG_NAME && git push origin $TAG_NAME"
