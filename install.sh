#!/usr/bin/env bash
# Installs benv by symlinking the CLI into ~/.local/bin (and the skill into
# ~/.claude/skills if that directory exists). Re-run after pulling updates —
# symlinks always point at this repo, so there is nothing to rebuild.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${BENV_BIN_DIR:-$HOME/.local/bin}"

mkdir -p "$BIN_DIR"
ln -sf "$REPO_DIR/bin/benv" "$BIN_DIR/benv"
chmod +x "$REPO_DIR/bin/benv"
echo "✔ linked $BIN_DIR/benv -> $REPO_DIR/bin/benv"

# Optional: install the Claude skill so agents know how to drive benv.
SKILLS_DIR="$HOME/.claude/skills"
if [ -d "$SKILLS_DIR" ]; then
  ln -sfn "$REPO_DIR/skills/parallel-env" "$SKILLS_DIR/parallel-env"
  echo "✔ linked $SKILLS_DIR/parallel-env -> $REPO_DIR/skills/parallel-env"
fi

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "⚠ $BIN_DIR is not on your PATH — add it to your shell profile." ;;
esac

echo "Done. Try: benv help"
