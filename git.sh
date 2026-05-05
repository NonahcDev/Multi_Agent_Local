#!/bin/bash

BRANCH="main"

case "$1" in
  up)
    # Commit message from arg or default to timestamp
    MSG="${2:-update $(date '+%Y-%m-%d %H:%M')}"

    echo "📦 Staging all changes..."
    git add .

    echo "📝 Committing: \"$MSG\""
    git commit -m "$MSG" || { echo "Nothing to commit."; exit 0; }

    echo "🚀 Pushing to origin/$BRANCH..."
    git push origin "$BRANCH"

    echo "✅ Done."
    ;;

  pull)
    echo "⬇️  Pulling from origin/$BRANCH..."
    git pull origin "$BRANCH"
    echo "✅ Done."
    ;;

  *)
    echo "Usage: ./git.sh [up|pull] [message]"
    echo ""
    echo "  up [msg]  - Stage all, commit, and push to origin/$BRANCH"
    echo "  pull      - Pull latest from origin/$BRANCH"
    echo ""
    echo "Examples:"
    echo "  ./git.sh up"
    echo "  ./git.sh up \"add docker support\""
    echo "  ./git.sh pull"
    exit 1
    ;;
esac

