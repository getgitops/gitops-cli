#!/usr/bin/env node

import { Command } from 'commander';
import { VaultExportCommand } from './commands/vault/export';
import { VaultRunCommand } from './commands/vault/run';
import { VaultSecretCommand } from './commands/vault/secret';
import { detectCiGitInfo } from './utils/ci';

interface Config {
  apiUrl?: string;
  apiKey?: string;
  serviceSlug?: string;
  projectSlug?: string;
  gitBranch?: string;
  gitRepoUrl?: string;
  gitAuthor?: string;
  gitVersion?: string;
  gitCommit?: string;
  tags?: string[] | string;
}

const program = new Command();

program
  .name('gops')
  .description('GitOps Platform Command Line Interface')
  .version(require('../package.json').version);

const creport = program
  .command('creport')
  .description('Commands related to code reporting and analysis');

creport
  .command('scan')
  .description('Executes code security/analysis scan')
  .option('-c, --config-file <path>', 'Path to JSON configuration file')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .option('--service <slug>', 'Service slug identifier')
  .option('--project <slug>', 'Project slug identifier')
  .option('--git-branch <branch>', 'Git branch name')
  .option('--git-repo-url <url>', 'Git repository URL')
  .option('--git-author <author>', 'Git commit author')
  .option('--git-version <version>', 'Git tag/version')
  .option('--git-commit <commit>', 'Git commit hash')
  .option('--tags <tags...>', 'List of tags or comma-separated string')
  .action(async (options) => {
    try {
      // 1. Cargar archivo JSON si existe
      let fileConfig: Config = {};
      // if (options.configFile) {
      //   const filePath = path.resolve(process.cwd(), options.configFile);
      //   if (!fs.existsSync(filePath)) {
      //     throw new Error(`El archivo de configuración no existe: ${filePath}`);
      //   }
      //   const fileContent = fs.readFileSync(filePath, 'utf-8');
      //   fileConfig = JSON.parse(fileContent);
      // }
      const defaultOptions = {
        apiUrl: null,
        apiKey: null,
        service: null,
        project: null,
        gitBranch: null,
        gitRepoUrl: null,
        gitAuthor: null,
        gitVersion: null,
        gitCommit: null,
        tags: [],
      };
      // Precedence: flags > CI metadata > GIT_* env vars (fallback in Command).
      const mergedOptions = { ...defaultOptions, ...fileConfig, ...detectCiGitInfo(), ...options };
      // console.log('🔧 Parámetros de configuración finales:', mergedOptions);
      const scanCommand = new (await import('./commands/creport/scan')).ScanCommand(mergedOptions);
      await scanCommand.execute();

    } catch (error: any) {
      console.error(`❌ Error en el comando scan: ${error.message || error}`);
      process.exit(1);
    }
  });

const tools = program
  .command('tools')
  .description('Manage the external scanners used by creport (Trivy, Syft, Gitleaks)');

tools
  .command('install')
  .description('Downloads and verifies the pinned versions of every scanner')
  .action(async () => {
    try {
      (await import('./utils/installs')).installAllTools();
    } catch (error: unknown) {
      console.error(`Error installing tools: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    }
  });

const vault = program
  .command('vault')
  .description('Commands for exporting and injecting vault secrets');

function addVaultOptions(command: Command) {
  return command
    .requiredOption('--api-url <url>', 'API base URL')
    .requiredOption('--api-key <key>', 'API key for authentication')
    .requiredOption('--project-id <id>', 'Project ID')
    .requiredOption('--path <path>', 'Vault path to export')
    .requiredOption('--env <environment>', 'Vault environment slug');
}

addVaultOptions(
  vault
    .command('export')
    .description('Exports vault secrets to a file')
    .requiredOption('--format <format>', 'Output format: env or json')
    .requiredOption('--output <file>', 'Path of the exported file'),
).action(async (options) => {
  try {
    await new VaultExportCommand(options).execute();
  } catch (error: unknown) {
    console.error(`Error exporting vault secrets: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
});

addVaultOptions(
  vault
    .command('run [command...]')
    .description('Runs a command with vault secrets injected as environment variables')
    .allowUnknownOption(true),
).action(async (command: string[], options) => {
  try {
    await new VaultRunCommand({ ...options, command }).execute();
  } catch (error: unknown) {
    console.error(`Error running command with vault secrets: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
});

const vaultSecret = vault.command('secret').description('Manage vault secrets');

function addVaultSecretOptions(command: Command) {
  return command
    .requiredOption('--api-url <url>', 'API base URL')
    .requiredOption('--api-key <key>', 'API key for authentication')
    .requiredOption('--project-id <id>', 'Project ID')
    .requiredOption('--path <path>', 'Vault path')
    .requiredOption('--key <key>', 'Secret key');
}

function runVaultSecret(action: keyof Pick<VaultSecretCommand, 'create' | 'get' | 'update' | 'delete'>) {
  return async (options: Record<string, unknown>) => {
    try {
      await new VaultSecretCommand(options)[action]();
    } catch (error: unknown) {
      console.error(`Error managing vault secret: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    }
  };
}

addVaultSecretOptions(
  vaultSecret
    .command('create')
    .description('Creates a vault secret')
    .requiredOption('--env <environment>', 'Vault environment slug')
    .requiredOption('--value <value>', 'Secret value')
    .option('--description <description>', 'Secret description'),
).action(runVaultSecret('create'));

addVaultSecretOptions(vaultSecret.command('get').description('Gets a vault secret')).action(
  runVaultSecret('get'),
);

addVaultSecretOptions(
  vaultSecret
    .command('update')
    .description('Updates a vault secret value')
    .requiredOption('--env <environment>', 'Vault environment slug')
    .requiredOption('--value <value>', 'Secret value')
    .option('--description <description>', 'Secret description'),
).action(runVaultSecret('update'));

addVaultSecretOptions(vaultSecret.command('delete').description('Deletes a vault secret')).action(
  runVaultSecret('delete'),
);

program.parse(process.argv);