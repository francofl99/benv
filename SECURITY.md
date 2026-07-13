# Security

## Model

benv is a local developer tool. It runs on your machine, against repos you already have
checked out, driven by a `.benv.json` you control.

- **External programs are invoked without a shell.** Branch names, instance names, paths, and
  service names are passed as explicit argv arguments (via `execFileSync`/`spawn`), so they
  cannot be interpreted as shell syntax — a branch named `` x$(rm -rf ~)`...` `` is treated as
  a literal ref, not a command.
- **`up`, `down`, and `postUp` in `.benv.json` are executed in a shell** on purpose — they are
  trusted project configuration, like `scripts` in `package.json`. Only run benv in a repo
  whose `.benv.json` you trust. Treat a `.benv.json` from an untrusted source the same way you
  would treat an untrusted `Makefile` or `package.json`.
- benv does not read, store, or transmit credentials. It never removes Docker volumes
  (`compose down` is called without `-v`) and, in shared-DB mode, joins existing external
  networks without creating or deleting them.

## Reporting a vulnerability

Please open a private report via GitHub Security Advisories on this repository, or open an
issue for non-sensitive concerns. Include steps to reproduce and the benv version
(`benv --version`).
