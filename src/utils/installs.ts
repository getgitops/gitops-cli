import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function ensureTrivyInstalled(): string {
  // Directorio local para guardar dependencias de tu CLI
  const binDir = join(homedir(), '.mi-cli', 'bin');
  const trivyPath = join(binDir, 'trivy');

  // Si ya existe, retornar la ruta directamente
  if (existsSync(trivyPath)) {
    return trivyPath;
  }

  console.log('Instalando Trivy por primera vez...');
  mkdirSync(binDir, { recursive: true });

  // El flag -b redirige la descarga al directorio sin requerir sudo
  const installCmd = `curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b "${binDir}"`;

  try {
    execSync(installCmd, { stdio: 'inherit' });
    return trivyPath;
  } catch (error) {
    throw new Error(`Error al instalar Trivy automáticamente: ${(error as Error).message}`);
  }
}