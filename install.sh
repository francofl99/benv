#!/usr/bin/env bash
# Installs benv by symlinking the CLI into ~/.local/bin, plus the Claude skill and
# slash command into ~/.claude (if that directory exists). Re-run after pulling
# updates — symlinks always point at this repo, so there is nothing to rebuild.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${BENV_BIN_DIR:-$HOME/.local/bin}"

mkdir -p "$BIN_DIR"
ln -sf "$REPO_DIR/bin/benv" "$BIN_DIR/benv"
chmod +x "$REPO_DIR/bin/benv"
echo "✔ linked $BIN_DIR/benv -> $REPO_DIR/bin/benv"

# Claude integration: skill (natural-language trigger) + /benv slash command.
CLAUDE_DIR="$HOME/.claude"
if [ -d "$CLAUDE_DIR" ]; then
  # Remove the pre-rename skill link if it still points here (migration cleanup).
  if [ -L "$CLAUDE_DIR/skills/parallel-env" ]; then
    rm -f "$CLAUDE_DIR/skills/parallel-env"
  fi
  mkdir -p "$CLAUDE_DIR/skills" "$CLAUDE_DIR/commands"
  ln -sfn "$REPO_DIR/skills/benv" "$CLAUDE_DIR/skills/benv"
  echo "✔ linked $CLAUDE_DIR/skills/benv"
  ln -sf "$REPO_DIR/commands/benv.md" "$CLAUDE_DIR/commands/benv.md"
  echo "✔ linked $CLAUDE_DIR/commands/benv.md  (use /benv)"
fi

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "⚠ $BIN_DIR is not on your PATH — add it to your shell profile." ;;
esac

echo "Done. Try: benv help"
