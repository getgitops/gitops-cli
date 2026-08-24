import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Command } from '../command';
import { ensureTrivyInstalled } from '../../utils/installs';


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
      tools.forEach(async (tool: string) => {
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
          console.log('✅ Resultados de Trivy obtenidos. Enviando resultados al servidor...');
          await this.callApi('scan', 'POST', {
            analysisId: analysisID,
            result: trivyResults,
            tool: 'trivy',
            status: 'completed',
          });
          console.log('✅ Escaneo con Trivy completado.');
        }
      });
    
      
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
}