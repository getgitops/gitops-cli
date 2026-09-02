#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

import { authApiKey } from './utils/auth';

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
      const mergedOptions = { ...defaultOptions, ...fileConfig, ...options };
      // console.log('🔧 Parámetros de configuración finales:', mergedOptions);
      const scanCommand = new (await import('./commands/creport/scan')).ScanCommand(mergedOptions);
      await scanCommand.execute();

    } catch (error: any) {
      console.error(`❌ Error en el comando scan: ${error.message || error}`);
      process.exit(1);
    }
  });

program.parse(process.argv);