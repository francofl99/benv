# benv — parallel branch environments

[![npm](https://img.shields.io/npm/v/%40francofl99%2Fbenv?color=cb3837&logo=npm)](https://www.npmjs.com/package/@francofl99/benv)
[![license](https://img.shields.io/github/license/francofl99/benv)](LICENSE)
[![node](https://img.shields.io/node/v/%40francofl99%2Fbenv)](package.json)

Run any branch of a project on its **own ports**, in its **own copy of the workspace**,
with its **own service stack** — so you can work several branches in parallel without the
friction of git worktrees (which share the checkout your tooling/Docker mounts).

> Built it because running several AI coding agents in parallel on git worktrees was painful —
> they fought over the one checkout my Docker stack mounts. benv gives each branch its own
> running copy on its own ports instead.

On macOS/APFS (and Linux Btrfs/XFS/ZFS) the copy is a **copy-on-write clone**, so it's
near-instant and near-zero disk until files change.

- Single-file Node CLI, **no dependencies** (only Node core modules).
- **Project-agnostic**: everything project-specific lives in a `.benv.json` manifest.
- Works with Docker Compose out of the box, or any stack via `up`/`down` commands.

## Demo

```console
$ benv up my-feature
Cloning workspace → ~/.benv/myproject/instances/my-feature (CoW)
Checking out my-feature from origin
Starting app on shared DB (project=myproject-my-feature, offset=+100)

✔ instance "my-feature" up
  branch:  my-feature
  dir:     ~/.benv/myproject/instances/my-feature
  offset:  +100
  db:      shared with main (untouched)
  ports:
    8080 → 8180  (→80)

$ benv ls
NAME         BRANCH       OFFSET   PROJECT               DIR
my-feature   my-feature   +100     myproject-my-feature  ~/.benv/myproject/instances/my-feature

$ benv open my-feature --code     # or bare `benv open my-feature` to drop into a shell there
```

<!-- Tip: record a real GIF with vhs (charmbracelet/vhs) or asciinema and embed it here. -->



## Requirements

- **Node 16+**
- **git**
- **Docker Compose** (for `compose`-based projects)
- Copy-on-write clones on macOS/APFS (`cp -c`) and Linux Btrfs/XFS/ZFS (`cp --reflink=auto`);
  a full copy is used on other filesystems.

## Install

**Via npm** (just the CLI):

```bash
npm i -g @francofl99/benv     # then: benv --version
# or run without installing:  npx @francofl99/benv up <branch>
```

**Via git clone** (CLI + Claude Code integration):

```bash
git clone git@github.com:francofl99/benv.git ~/Projects/benv
cd ~/Projects/benv
./install.sh
```

`install.sh` symlinks `bin/benv` into `~/.local/bin` (make sure that's on your `PATH`) and,
if `~/.claude` exists, the Claude **skill** (`benv`, natural-language trigger) and **`/benv`
slash command** into `~/.claude`. Re-running after `git pull` needs no rebuild — the symlinks
always point at the repo.

Check it: `benv --version`.

### Uninstall

```bash
rm -f ~/.local/bin/benv ~/.claude/skills/benv ~/.claude/commands/benv.md   # remove the symlinks
rm -rf ~/.benv                                           # (optional) instance state + clones
```

## Quick start

```bash
cd /path/to/your/project
benv init                 # scaffolds .benv.json (autodetects docker-compose.yml)
# edit .benv.json (see below), then:
benv up my-branch         # clone workspace + checkout branch + run on a free port offset
benv ls
benv open my-branch --zed
benv rm my-branch
```

## Commands

| Command | What it does |
|---------|--------------|
| `benv init` | Scaffold `.benv.json` in the current dir |
| `benv up <branch> [--name N]` | Clone workspace, checkout branch, start on a free port offset. **Default: shares the main stack's DB** |
| `benv up <branch> --isolated-db` | Full stack with its own fresh DB volumes instead |
| `benv ls` | List instances (shows each one's primary port) |
| `benv open [name] [--<editor> \| --editor <cmd>] [--root]` | With no editor flag, open an interactive shell in the instance dir (subshell — `exit` to return). `--<editor>` instead runs `<editor> <dir>` (e.g. `--code`, `--zed`, `--claude`). `--root` targets the whole workspace instead of the repo dir |
| `benv ports <name>` | Show port mappings |
| `benv down <name>` | Stop an instance's stack (keeps the dir) |
| `benv rm <name>` | Stop + delete an instance |
| `benv prune` | Drop state entries whose dir is gone |

## DB mode: shared (default) vs isolated

- **Shared (default)** — the instance starts only the `appServices` (with `--no-deps`) on new
  ports and joins the main stack's **external networks**, so service names (`db`, `redis`, …)
  resolve to the MAIN containers. Same data; the main DB is never created, migrated, or removed.
  You can point many ports at the same DB. Requires the main stack to be running.
- **Isolated (`--isolated-db`)** — full stack with its own volumes, seeded from scratch. For
  testing migrations or clean data without touching main.

## Manifest (`.benv.json`)

Docker Compose project:

```json
{
  "name": "myproject",
  "workspaceRoot": ".",
  "repoSubdir": "app",
  "instancesRoot": "~/.benv/myproject/instances",
  "portOffsetStep": 100,
  "compose": {
    "file": "docker-compose.yml",
    "projectPrefix": "myproject",
    "rewriteNames": true,
    "appServices": ["web", "worker"]
  },
  "postUp": ["docker exec $BENV_PROJECT-web-1 php artisan migrate --force"]
}
```

Non-Docker stack (command-based):

```json
{
  "name": "myservice",
  "workspaceRoot": ".",
  "up": "PORT=$((3000 + BENV_PORT_OFFSET)) docker run -d --name $BENV_PROJECT -p $PORT:3000 -v $BENV_REPO:/app myimage",
  "down": "docker rm -f $BENV_PROJECT"
}
```

### Fields

| Field | Meaning |
|-------|---------|
| `name` | Project id (namespaces state under `~/.benv/<name>`) |
| `workspaceRoot` | Dir to clone, relative to the manifest. For multi-repo layouts, point at the folder that holds everything the stack mounts |
| `repoSubdir` | Subdir where the branch is checked out (and what `benv open` opens) |
| `instancesRoot` | Where instance clones live |
| `portOffsetStep` | Port separation per instance; instance N → offset `N*step` |
| `compose.file` | Compose file, relative to `workspaceRoot` |
| `compose.projectPrefix` | Prefix for the per-instance `COMPOSE_PROJECT_NAME` |
| `compose.appServices` | Services each instance runs (required for shared mode) |
| `up` / `down` | Command-based lifecycle (instead of `compose`) |
| `postUp` | Commands run after the stack is up (provisioning). See timing note below |

### `postUp` env

Each `postUp` command (and `up`/`down`) runs with: `BENV_DIR`, `BENV_REPO`, `BENV_NAME`,
`BENV_PORT_OFFSET`, `BENV_PROJECT`.

**Timing**: `postUp` runs right after `docker compose up -d` returns, while containers may
still be booting. If a command depends on an internal process (supervisor, php-fpm, …), wrap
it in a wait/retry.

## How it works

1. **Clone** `workspaceRoot` to the instance dir — copy-on-write on macOS/APFS (`cp -c`) and
   Linux Btrfs/XFS/ZFS (`cp --reflink=auto`); a full copy otherwise (or `rsync` with excludes).
2. **Checkout** the branch in `repoSubdir` (`-f`, since the clone is throwaway):
   existing local branch → checkout; else on origin → fetch + checkout; else **create a new
   branch from the latest default branch** (`origin/main` or `origin/master`, fetched fresh).
3. **Isolate the stack**: rewrite host ports (+offset); in isolated mode prefix network/volume
   names; in shared mode mark networks external and start only `appServices` with `--no-deps`.
4. **Track state** in `~/.benv/<name>/state.json`; pick the lowest port offset whose ports are
   all free so instances never collide with each other or the main stack.

## Notes / limits

- Shared mode needs the main stack running (it joins its networks).
- Port offset assumes compose publishes ports as `HOST:CONTAINER`.
- Clone `workspaceRoot` with everything the stack mounts (sibling repos included), or relative
  mounts will point outside the copy.

## Security

External programs (git, docker, cp, rsync, editors) are invoked **without a shell**, so branch
names, paths, and other inputs can never be interpreted as shell syntax. The `up`/`down`/
`postUp` strings in a `.benv.json` **are** run in a shell — they are trusted project config, so
only run benv in a repo whose `.benv.json` you trust. See [SECURITY.md](SECURITY.md).

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Keep it dependency-free and
shell-injection-free. Run `npm test` before pushing.

## License

[MIT](LICENSE)
