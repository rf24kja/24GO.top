import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const names = ['Home','Getting-Started','Architecture','API-and-SDK','Roadmap','Contributing','FAQ','_Sidebar'];
const content = Object.fromEntries(names.map(name => {
  const filename = new URL('../docs/wiki/' + name + '.md', import.meta.url);
  return [name, readFileSync(fileURLToPath(filename), 'utf8')];
}));

test('initial Wiki pages exist and make no public-launch claim', () => {
  assert.equal(names.length, 8);
  for (const name of names) {
    assert.ok(content[name].length > 200, 'empty Wiki page: ' + name);
    assert.ok(!content[name].includes('/24gotop-starter'), 'outdated repository link: ' + name);
  }
  assert.match(content.Home, /developer prototype|pre-launch/i);
  assert.match(content.Architecture, /not yet built|NOT IMPLEMENTED|Not yet built/i);
  assert.match(content.FAQ, /not launched/i);
});

test('Wiki navigation connects all topic pages', () => {
  for (const name of names.filter(name => !['Home','_Sidebar'].includes(name))) {
    const title = name.replaceAll('-', ' ');
    assert.ok(content._Sidebar.includes('[[' + title + ']]'), 'Sidebar link missing: ' + title);
    assert.ok(content.Home.includes('[[' + title + ']]'), 'Home link missing: ' + title);
  }
});

test('publishing guide acknowledges the separate Wiki repository', () => {
  const guide = readFileSync(fileURLToPath(new URL('../docs/WIKI_PUBLISHING.md',import.meta.url)), 'utf8');
  assert.match(guide, /24GO\.top\.wiki\.git/);
  assert.match(guide, /git diff/);
  assert.match(guide, /does not automatically publish/i);
});
