import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const OPERATIONAL_SCRIPTS = [
  'create-mapa7p-catalog.ts',
  'create-mapa7p-pilot.ts',
  'production-decision-smoke.ts',
  'production-overview-smoke.ts',
];

test('sessões administrativas temporárias encerram somente a sessão local', async () => {
  for (const script of OPERATIONAL_SCRIPTS) {
    const source = await readFile(new URL(script, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\.auth\.signOut\(\s*\)/, `${script} contém signOut global implícito`);
    assert.match(source, /\.auth\.signOut\(\{\s*scope:\s*'local'\s*\}\)/, `${script} não encerra a sessão local explicitamente`);
  }
});
