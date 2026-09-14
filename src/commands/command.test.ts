import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Command } from './command';

const environmentKeys = ['API_URL', 'API_KEY', 'PATH'] as const;
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('Command parameters', () => {
  it('prefers explicit command parameters over environment variables', () => {
    process.env.API_URL = 'https://environment.example/api';
    process.env.API_KEY = 'environment-key';
    process.env.PATH = '/system/path';

    const command = new Command({
      apiUrl: 'https://command.example/api',
      apiKey: 'command-key',
      path: '/vault/path',
    });

    assert.deepEqual(command.params, {
      apiUrl: 'https://command.example/api',
      apiKey: 'command-key',
      path: '/vault/path',
    });
  });

  it('uses environment variables when command parameters are not provided', () => {
    process.env.API_URL = 'https://environment.example/api';
    process.env.API_KEY = 'environment-key';
    process.env.PATH = '/environment/vault-path';

    const command = new Command({ apiUrl: undefined, apiKey: undefined, path: undefined });

    assert.deepEqual(command.params, {
      apiUrl: 'https://environment.example/api',
      apiKey: 'environment-key',
      path: '/environment/vault-path',
    });
  });
});