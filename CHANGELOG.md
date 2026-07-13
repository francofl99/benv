# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- `benv open [name]` to open an instance in an editor (`--zed`/`--code`/`--cursor`/`--editor`,
  `--root` for the whole workspace).
- New branches are created from the latest default branch (`main`/`master`) when the requested
  branch exists neither locally nor on origin.
- Shared-DB mode (default) vs isolated-DB mode (`--isolated-db`).
- `postUp` provisioning hook.
- `benv --version`.
- Test suite (`npm test`) and standards docs (CONTRIBUTING, SECURITY, CHANGELOG).

### Security
- All external commands are invoked without a shell (explicit argv), removing command-injection
  risk from branch names, paths, and other inputs.

## [0.1.0]
- Initial release: `init`, `up`, `ls`, `ports`, `down`, `rm`, `prune`; copy-on-write workspace
  clones; docker-compose port/name isolation; per-project `.benv.json` manifest.
