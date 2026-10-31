import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const yaml=readFileSync(new URL('../.github/workflows/seo-live.yml',import.meta.url),'utf8');
const pages=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
const smoke=readFileSync(new URL('../scripts/check-live-seo.sh',import.meta.url),'utf8');

test('live SEO smoke never runs before the corresponding Pages deployment completes',()=>{
 const trigger=yaml.slice(yaml.indexOf('\non:\n')+1,yaml.indexOf('\npermissions:'));
 assert.ok(trigger.startsWith('on:\n'),'workflow trigger exists');
 assert.doesNotMatch(trigger,/^  push:/m,'push can race published CDN content');
 assert.match(trigger,/^  workflow_run:$/m);
 assert.match(trigger,/^    workflows: \["Deploy pre-launch landing"\]$/m);
 assert.match(trigger,/^    types: \[completed\]$/m);
 assert.match(trigger,/^    branches: \[main\]$/m);
 assert.match(trigger,/^  workflow_dispatch:$/m);
 assert.match(trigger,/^  schedule:$/m);
 assert.match(yaml,/github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(pages,/^name: Deploy pre-launch landing$/m);
 assert.match(smoke,/Live engineering article is missing static related reading/);
 assert.doesNotMatch(yaml,/id-token:\s*write|pages:\s*write|pull_request_target|repository_dispatch/);
});
