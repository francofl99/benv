'use strict';

// End-to-end test for `benv rm` with several names, against a throwaway HOME + workspace.
// Run with: npm test  (or: node test/rm.test.js)

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const BIN = path.join(__dirname, '..', 'bin', 'benv');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'benv-rm-'));
const home = path.join(tmp, 'home');
const ws = path.join(tmp, 'ws');
const stateFile = path.join(home, '.benv', 't', 'state.json');
fs.mkdirSync(ws, { recursive: true });
fs.writeFileSync(path.join(ws, '.benv.json'), JSON.stringify({ name: 't', down: 'echo down $BENV_NAME; sleep 1' }));

function seed(names) {
  const instances = {};
  for (const name of names) {
    const dir = path.join(tmp, 'instances', name);
    fs.mkdirSync(path.join(dir, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'nested', 'f.txt'), name);
    instances[name] = { name, dir, repoDir: dir, offset: 100, project: `t_${name}` };
  }
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify({ instances }));
}

function benv(args) {
  return cp.spawnSync(process.execPath, [BIN, ...args], { cwd: ws, env: { ...process.env, HOME: home }, encoding: 'utf8' });
}

let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
}

try {
  seed(['a', 'b', 'c', 'keep']);

  const unknown = benv(['rm', 'a', 'nope']);
  ok(unknown.status !== 0, 'unknown name fails');
  ok(unknown.stderr.includes('nope'), 'unknown name is reported');
  ok(fs.existsSync(path.join(tmp, 'instances', 'a')), 'unknown name aborts before removing anything');

  const t0 = Date.now();
  const res = benv(['rm', 'a', 'b', 'c', 'a']);
  const elapsed = Date.now() - t0;
  ok(res.status === 0, `rm succeeds: ${res.stderr}`);
  ok(elapsed < 2500, `three 1s downs run in parallel (took ${elapsed}ms)`);
  ok(['a', 'b', 'c'].every((n) => res.stdout.includes(`[${n}] down ${n}`)), 'output lines are prefixed per instance');
  ok(['a', 'b', 'c'].every((n) => !fs.existsSync(path.join(tmp, 'instances', n))), 'dirs removed');
  ok(fs.existsSync(path.join(tmp, 'instances', 'keep')), 'unrelated instance dir kept');
  const left = Object.keys(JSON.parse(fs.readFileSync(stateFile, 'utf8')).instances);
  ok(left.length === 1 && left[0] === 'keep', 'state keeps only the unrelated instance');

  const single = benv(['rm', 'keep']);
  ok(single.status === 0 && !single.stdout.includes('[keep]'), 'single rm is not prefixed');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`ok — ${passed} assertions passed`);
