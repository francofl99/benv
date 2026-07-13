'use strict';

// Minimal, dependency-free tests for the compose transforms.
// Run with: npm test  (or: node test/rewrite.test.js)

const assert = require('assert');
const path = require('path');
const { rewriteCompose, sharedCompose, slug } = require(path.join(__dirname, '..', 'bin', 'benv'));

let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
}

const FIXTURE = `version: '2.1'
services:
  web:
    image: acme/web
    depends_on:
      - db
    ports:
     - "8080:80"
     - "4443:443"
  db:
    image: mysql:8
    ports:
      - "3307:3306"
    volumes:
     - data:/var/lib/mysql
networks:
  appnet:
    name: acme_appnet
    driver: "bridge"
volumes:
  data:
    name: acme_data
`;

// --- isolated mode ---------------------------------------------------------
{
  const { text, portMap } = rewriteCompose(FIXTURE, { offset: 100, prefix: 'acme', project: 'acme-feature' });
  ok(text.includes('- "8180:80"'), 'isolated: web host port offset');
  ok(text.includes('- "3407:3306"'), 'isolated: db host port offset');
  ok(text.includes('name: acme_feature_appnet'), 'isolated: network name prefixed');
  ok(text.includes('name: acme_feature_data'), 'isolated: volume name prefixed');
  ok(portMap.length === 3, 'isolated: 3 ports mapped');
}

// --- shared mode -----------------------------------------------------------
{
  const { text, portMap } = sharedCompose(FIXTURE, { offset: 200, appServices: ['web'] });
  ok(portMap.every((p) => p.service === 'web'), 'shared: only app-service ports mapped');
  ok(portMap.length === 2, 'shared: 2 web ports mapped');
  ok(text.includes('- "8280:80"'), 'shared: web port offset');
  ok(text.includes('external: true'), 'shared: networks external');
  ok(text.includes('name: acme_appnet'), 'shared: keeps main network name');
  ok(!/name: acme_[a-z0-9]+_appnet/.test(text), 'shared: does not prefix network name');
}

// --- slug ------------------------------------------------------------------
{
  ok(slug('feat/ITWC-1223_bots') === 'feat-itwc-1223-bots', 'slug normalizes');
  ok(slug('--Weird__Name--') === 'weird-name', 'slug trims separators');
}

console.log(`ok — ${passed} assertions passed`);
