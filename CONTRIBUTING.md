# Contributing to benv

Thanks for helping improve benv. It's a small, dependency-free tool — contributions
should keep it that way.

## Ground rules

- **No runtime dependencies.** The CLI uses only Node core modules. Don't add npm deps.
- **No shell interpolation of untrusted input.** Invoke external programs (git, docker, cp,
  rsync, editors) with an explicit argv array via the `runFile`/`capture`/`git` helpers —
  never build a shell string from a branch name, path, or other input. The only shelled-out
  strings are `up`/`down`/`postUp` from a project's own `.benv.json` (trusted config), run
  through `shell()`.
- **Keep it cross-project.** Nothing project-specific belongs in `bin/benv`; it lives in the
  user's `.benv.json`.

## Dev setup

```bash
git clone git@github.com:francofl99/benv.git
cd benv
./install.sh          # symlinks bin/benv into ~/.local/bin
npm test              # runs the transform tests
```

Because `install.sh` symlinks, edits to `bin/benv` take effect immediately — no rebuild.

## Before opening a PR

- `npm test` passes.
- `node --check bin/benv` passes.
- New behavior has a test in `test/` where practical.
- README updated if you changed the CLI surface or manifest schema.

## Commit style

Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
