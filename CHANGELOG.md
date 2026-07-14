# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- `benv ls` now shows a `PORTS` column with each instance's primary (app) host port, plus a
  `(+N)` count of the other mapped ports.

## [0.2.0] — 2026-07-13

### Added
- Linux copy-on-write clones via `cp --reflink=auto` (Btrfs/XFS/ZFS); falls back to a full
  copy on other filesystems. Previously only macOS/APFS got CoW.

### Changed
- `benv open` with no editor flag now opens an interactive shell in the instance directory
  (subshell — `exit` to return) instead of falling back to a configured editor. Pass
  `--<editor>` to open an editor. The manifest `editor` field is no longer used.

## [0.1.0] — 2026-07-13

First release.

### Features
- Commands: `init`, `up`, `ls`, `open`, `ports`, `down`, `rm`, `prune`, `--version`.
- Copy-on-write workspace clones (`cp -c` on APFS; `rsync` fallback elsewhere).
- Docker Compose isolation: host-port offset + free-port allocation so instances never collide.
- **Shared DB mode (default)** — runs only `appServices` and joins the main stack's external
  networks, so the branch shares the main DB (untouched). **Isolated mode (`--isolated-db`)**
  runs the full stack with its own fresh volumes.
- Creates a new branch from the latest default branch (`main`/`master`) when the requested
  branch exists neither locally nor on origin.
- `postUp` provisioning hook (env: `BENV_DIR`/`BENV_REPO`/`BENV_NAME`/`BENV_PORT_OFFSET`/`BENV_PROJECT`).
- `benv open` accepts any `--<editor>` flag and runs `<editor> <dir>` in the foreground
  (e.g. `--code`, `--zed`, `--claude`); `--root` opens the whole workspace.
- Per-project `.benv.json` manifest; command-based (`up`/`down`) support for non-Docker stacks.
- `install.sh` also installs a Claude skill (`benv`) and `/benv` slash command into `~/.claude`.

### Security
- All external commands are invoked without a shell (explicit argv), removing command-injection
  risk from branch names, paths, and other inputs. Only manifest-authored `up`/`down`/`postUp`
  run in a shell (trusted config).
