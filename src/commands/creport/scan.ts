import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Command } from '../command';
import { ensureGitleaksInstalled, ensureSyftInstalled, ensureTrivyInstalled } from '../../utils/installs';


const execFileAsync = promisify(execFile);


export class ScanCommand extends Command {
  constructor(options: any) {
    super(options);
    this.apiURL = this.apiURL + '/code-report';
  }

  async execute() {

    // Authorize
    // Logic to execute the scan command
    console.log('🚀 Obteniendo herramientas de escaneo...');
      
      const scanStart = await this.callApi('scan', 'POST', {
        service: this.params.service,
        project: this.params.project,
        gitInfo: {
          repositoryUrl: this.params.gitRepoUrl,
          branch: this.params.gitBranch,
          author: this.params.gitAuthor,
          version: this.params.gitVersion,
          commit: this.params.gitCommit,
        },
        // tags: this.params.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        status: 'start', // Add status field to indicate the scan is start
        error: null,
        result: {},
      });
      const tools = scanStart.tools || [];
      console.log(`🔧 Herramientas de escaneo obtenidas: ${tools.join(', ')}`);
      for (const tool of tools as string[]) {
        if(tool === 'trivy') {
          console.log(`🔧 Preparando para escanear con ${tool}...`);
          const scanTrivyProgress = await this.callApi('scan', 'POST', {
            service: this.params.service,
            project: this.params.project,
            tool: 'trivy',
            status: 'in_progress', // Add status field to indicate the scan is in progress
          });

          const analysisID = scanTrivyProgress.analysis.id;
          console.log('🔍 Analysis ID:', analysisID);

          const trivyResults = await this.scanWithTrivy(this.params.scanPath || '.').catch(async (error) => {
            console.error('❌ Error al ejecutar Trivy:', error.message);
            await this.callApi('scan', 'POST', {
              analysisId: analysisID,
              result: {},
              tool: 'trivy',
              status: 'failed',
              error: error.message,
            });
            return null;
          });
          if (trivyResults === null) {
            continue;
          }
          console.log('✅ Resultados de Trivy obtenidos. Enviando resultados al servidor...');
          await this.callApi('scan', 'POST', {
            analysisId: analysisID,
            result: trivyResults,
            tool: 'trivy',
            status: 'completed',
          });
          console.log('✅ Escaneo con Trivy completado.');
        } else if(tool === 'sbom' || tool === 'syft') {
          console.log(`🔧 Preparando para escanear con ${tool}...`);
          const scanSyftProgress = await this.callApi('scan', 'POST', {
            service: this.params.service,
            project: this.params.project,
            tool,
            status: 'in_progress', // Add status field to indicate the scan is in progress
          });

          const analysisID = scanSyftProgress.analysis.id;
          console.log('🔍 Analysis ID:', analysisID);

          const syftResults = await this.scanWithSyft(this.params.scanPath || '.').catch(async (error) => {
            console.error('❌ Error al ejecutar Syft:', error.message);
            await this.callApi('scan', 'POST', {
              analysisId: analysisID,
              result: {},
              tool,
              status: 'failed',
              error: error.message,
            });
            return null;
          });
          if (syftResults === null) {
            continue;
          }
          console.log('✅ Resultados de Syft obtenidos. Enviando resultados al servidor...');
          await this.callApi('scan', 'POST', {
            analysisId: analysisID,
            result: syftResults,
            tool,
            status: 'completed',
          });
          console.log(`✅ Escaneo con ${tool} completado.`);
        } else if(tool === 'gitleaks') {
          console.log(`🔧 Preparando para escanear con ${tool}...`);
          const scanGitleaksProgress = await this.callApi('scan', 'POST', {
            service: this.params.service,
            project: this.params.project,
            tool: 'gitleaks',
            status: 'in_progress',
          });

          const analysisID = scanGitleaksProgress.analysis.id;
          console.log('🔍 Analysis ID:', analysisID);

          const gitleaksResults = await this.scanWithGitleaks(this.params.scanPath || '.').catch(async (error) => {
            console.error('❌ Error al ejecutar Gitleaks:', error.message);
            await this.callApi('scan', 'POST', {
              analysisId: analysisID,
              result: {},
              tool: 'gitleaks',
              status: 'failed',
              error: error.message,
            });
            return null;
          });
          if (gitleaksResults === null) {
            continue;
          }
          console.log('✅ Resultados de Gitleaks obtenidos. Enviando resultados al servidor...');
          await this.callApi('scan', 'POST', {
            analysisId: analysisID,
            result: gitleaksResults,
            tool: 'gitleaks',
            status: 'completed',
          });
          console.log('✅ Escaneo con Gitleaks completado.');
        }
      }
    
      
  }
  
  private async scanWithTrivy(path: string = '.') {
    console.log(`🔍 Ejecutando Trivy en la ruta: ${path}`);
    try {
        const trivyBinary = ensureTrivyInstalled();
        const { stdout } = await execFileAsync(
            trivyBinary,
            [
                'fs',
                '--format', 'json',
                '--quiet',
                path
            ], 
            {
                maxBuffer: 20 * 1024 * 1024 // Buffer expandido para reportes grandes
            }
        );

        return JSON.parse(stdout);
    } catch (error: any) {
        // Si Trivy devuelve un código de salida distinto de 0 pero genera stdout
        if (error.stdout) {
            return JSON.parse(error.stdout);
        }
        throw new Error(`Error al ejecutar Trivy: ${error.message}`);
    }
  }

  private async scanWithSyft(path: string = '.') {
    console.log(`📦 Generando SBOM con Syft en la ruta: ${path}`);
    try {
        const syftBinary = ensureSyftInstalled();
        const { stdout } = await execFileAsync(
            syftBinary,
            [
                `dir:${path}`,
                '--output', 'cyclonedx-json',
                '--quiet'
            ],
            {
                maxBuffer: 50 * 1024 * 1024
            }
        );

        return JSON.parse(stdout);
    } catch (error: any) {
        if (error.stdout) {
            return JSON.parse(error.stdout);
        }
        throw new Error(`Error al ejecutar Syft: ${error.message}`);
    }
  }

  private async scanWithGitleaks(path: string = '.') {
    console.log(`🕵️ Ejecutando Gitleaks en la ruta: ${path}`);
    try {
        const gitleaksBinary = ensureGitleaksInstalled();
        const reportPath = join(tmpdir(), `gitleaks-report-${Date.now()}.json`);

        const { stdout, stderr } = await execFileAsync(
            gitleaksBinary,
            [
                'detect',
                '--source', path,
                '--report-path', reportPath,
                '--report-format', 'json',
                '--no-banner',
                '--exit-code', '0'
            ],
            {
                maxBuffer: 20 * 1024 * 1024
            }
        );

        const fileOutput = (() => {
          try {
            return readFileSync(reportPath, 'utf8').trim();
          } catch {
            return '';
          }
        })();

        const output = fileOutput || (stdout || '').trim();
        if (!output) {
          return { Findings: [] };
        }

        try {
          return JSON.parse(output);
        } catch {
          if (stderr && stderr.trim()) {
            throw new Error(stderr.trim());
          }
          throw new Error('Gitleaks devolvió una salida no válida en JSON');
        }
    } catch (error: any) {
        const output = error.stdout || error.stderr || '';
        if (output && output.trim()) {
            try {
                return JSON.parse(output.trim());
            } catch {
                // Si no es JSON, se propaga el error original.
            }
        }
        throw new Error(`Error al ejecutar Gitleaks: ${error.message}`);
    }
  }
}