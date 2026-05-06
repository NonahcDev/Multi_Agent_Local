#!/bin/bash

BRANCH="main"

case "$1" in
  up)
    MSG="${2:-update $(date '+%Y-%m-%d %H:%M')}"

    echo "Staging all changes..."
    git add .

    echo "Committing: \"$MSG\""
    git commit -m "$MSG" || { echo "Nothing to commit."; exit 0; }

    echo "Pushing to origin/$BRANCH..."
    git push origin "$BRANCH"

    echo "Done."
    ;;

  pull)
    echo "Checking for local changes..."
    if ! git diff --quiet || ! git diff --cached --quiet; then
      echo "Stashing local changes..."
      git stash push -m "auto-stash before pull $(date '+%Y-%m-%d %H:%M')"
      STASHED=1
    fi

    echo "Pulling from origin/$BRANCH..."
    git pull origin "$BRANCH"

    if [ "${STASHED}" = "1" ]; then
      echo "Restoring stashed changes..."
      git stash pop || echo "Warning: stash pop had conflicts — resolve manually with: git status"
    fi

    echo "Done."
    ;;

  sync)
    MSG="${2:-update $(date '+%Y-%m-%d %H:%M')}"

    echo "Pulling latest first..."
    bash "$0" pull

    echo "Staging and pushing..."
    bash "$0" up "$MSG"
    ;;

  st|status)
    git status
    ;;

  *)
    echo "Usage: ./git.sh <command> [message]"
    echo ""
    echo "  up [msg]   - Stage all, commit, and push"
    echo "  pull       - Pull latest (auto-stash if needed)"
    echo "  sync [msg] - Pull then push in one step"
    echo "  st         - Show git status"
    echo ""
    echo "Examples:"
    echo "  ./git.sh up"
    echo "  ./git.sh up \"add feature\""
    echo "  ./git.sh pull"
    echo "  ./git.sh sync"
    exit 1
    ;;
esac
