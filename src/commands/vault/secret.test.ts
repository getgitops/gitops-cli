import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VaultSecretCommand } from './secret';

const options = {
  apiUrl: 'https://api.example.test/api',
  apiKey: 'gvs_test',
  projectId: 'project-1',
  path: '/database',
  key: 'DB_PASSWORD',
  env: 'prod',
  value: 'secret-value',
};

function createCommand() {
  const command = new VaultSecretCommand(options);
  const requests: unknown[][] = [];
  command.callApi = async (...args: unknown[]) => {
    requests.push(args);
    return { success: true };
  };
  return { command, requests };
}

describe('VaultSecretCommand', () => {
  it('creates a secret with its value for the requested environment', async () => {
    const { command, requests } = createCommand();
    await command.create();
    assert.deepEqual(requests, [
      ['vault/secret', 'POST', { projectId: 'project-1', path: '/database', key: 'DB_PASSWORD', values: { prod: 'secret-value' } }],
    ]);
  });

  it('gets a secret by its path and key', async () => {
    const { command, requests } = createCommand();
    await command.get();
    assert.deepEqual(requests, [['vault/secret/DB_PASSWORD', 'GET', { projectId: 'project-1', path: '/database' }]]);
  });

  it('updates a secret value for the requested environment', async () => {
    const { command, requests } = createCommand();
    await command.update();
    assert.deepEqual(requests, [[
      'vault/secret/DB_PASSWORD?projectId=project-1&path=%2Fdatabase',
      'PATCH',
      { environment: 'prod', value: 'secret-value' },
    ]]);
  });

  it('deletes a secret by its path and key', async () => {
    const { command, requests } = createCommand();
    await command.delete();
    assert.deepEqual(requests, [[
      'vault/secret/DB_PASSWORD?projectId=project-1&path=%2Fdatabase',
      'DELETE',
    ]]);
  });
});