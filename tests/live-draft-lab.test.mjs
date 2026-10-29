import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/live-draft-lab.yml',import.meta.url),'utf8');
const smoke=readFileSync(new URL('../scripts/check-live-draft-lab.sh',import.meta.url),'utf8');

test('public Draft Lab release evidence checks actual canonical HTTPS assets',()=>{
  assert.match(smoke,/https:\/\/24go\.top/);
  for(const name of ['draft-lab.html','draft-lab.js','draft-lab-logic.js','draft-lab-preview.js','draft-lab-i18n.js']){
    assert.ok(smoke.includes(name),'Missing '+name);
  }
  for(const marker of ['id="formatLink"','safeCitationUrl','noopener noreferrer ugc',
    'does not publish, upload or automatically save your writing',
    'Hosted public publishing is not live','id="uiLocale"','UI_STRINGS',
    'applyUiLanguage(document,uiLocale.value)']){
    assert.ok(smoke.includes(marker),'Missing verified public feature '+marker);
  }
  assert.match(smoke,/--proto '=https' --proto-redir '=https'/);
  assert.match(smoke,/--connect-timeout 10 --max-time 25/);
  assert.doesNotMatch(smoke,/PUBLISH_API_KEY|sb_secret_|VERCEL_TOKEN|Authorization:|localStorage|--data(?:-raw)?/);
});
test('read-only workflow runs only after Pages delivery or explicit manual dispatch',()=>{
  assert.doesNotMatch(workflow,/^  push:/m,'a push-triggered smoke would race the Pages deploy');
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/Deploy pre-launch landing/);
  assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/contents: read/);
  assert.match(workflow,/bash -n scripts\/check-live-draft-lab\.sh/);
  assert.doesNotMatch(workflow,/pages: write|id-token: write|secrets\.|environment: production/);
});
