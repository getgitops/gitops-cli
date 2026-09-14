import { spawn } from 'node:child_process';
import { Command } from '../command';

function parseEnv(content: string): NodeJS.ProcessEnv {
  return content.split(/\r?\n/).reduce<NodeJS.ProcessEnv>((environment, line) => {
    const separator = line.indexOf('=');
    if (separator > 0 && !line.startsWith('#')) {
      environment[line.slice(0, separator)] = line.slice(separator + 1);
    }
    return environment;
  }, {});
}

export class VaultRunCommand extends Command {
  async execute() {
    if (this.params.command.length === 0) {
      throw new Error('a command must be provided after --');
    }

    const content = await this.callApi(
      'vault/export',
      'GET',
      {
        projectId: this.params.projectId,
        path: this.params.path,
        env: this.params.env,
        format: 'env',
      },
      'text',
    );
    const child = spawn(this.params.command.join(' '), {
      cwd: process.cwd(),
      env: { ...process.env, ...parseEnv(content) },
      shell: true,
      stdio: 'inherit',
    });

    await new Promise<void>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(signal ? `command terminated with signal ${signal}` : `command exited with code ${code}`));
      });
    });
  }
}