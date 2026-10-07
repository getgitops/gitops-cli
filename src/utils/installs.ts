import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform, arch } from 'node:os';
import { PINNED_TOOLS, ToolName } from './tool-versions';

// Cada versión se instala en su propio directorio, así al subir la versión
// fijada se descarga la nueva y nunca se reutiliza un binario no verificado.
// GOPS_TOOLS_DIR permite usar binarios preinstalados (p. ej. en la imagen Docker,
// donde los CI cambian HOME).
const TOOLS_DIR = process.env.GOPS_TOOLS_DIR || join(homedir(), '.gitops-cli', 'tools');

const DISPLAY_NAMES: Record<ToolName, string> = {
  trivy: 'Trivy',
  syft: 'Syft',
  gitleaks: 'Gitleaks',
};

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function ensureToolInstalled(name: ToolName): string {
  const tool = PINNED_TOOLS[name];
  const displayName = DISPLAY_NAMES[name];
  const installDir = join(TOOLS_DIR, name, tool.version);
  const binaryPath = join(installDir, name);

  if (existsSync(binaryPath)) {
    return binaryPath;
  }

  const platformKey = `${platform()}-${arch()}`;
  const asset = tool.assets[platformKey];
  if (!asset) {
    throw new Error(`Plataforma no soportada para ${displayName}: ${platformKey}`);
  }

  console.log(`Instalando ${displayName} ${tool.version}...`);

  const tmpRoot = join(TOOLS_DIR, name, `.install-${process.pid}-${Date.now()}`);
  const archivePath = join(tmpRoot, asset.file);
  const url = `https://github.com/${tool.repo}/releases/download/${tool.tag}/${asset.file}`;

  try {
    mkdirSync(tmpRoot, { recursive: true });

    execFileSync('curl', ['-fsSL', '--proto', '=https', '--tlsv1.2', '-o', archivePath, url], {
      stdio: 'inherit',
    });

    const actual = sha256File(archivePath);
    if (actual !== asset.sha256) {
      throw new Error(
        `checksum SHA-256 no coincide para ${asset.file} (esperado ${asset.sha256}, obtenido ${actual}). ` +
          'Se aborta la instalación.',
      );
    }

    execFileSync('tar', ['-xzf', archivePath, '-C', tmpRoot, name], { stdio: 'inherit' });

    const extractedBinary = join(tmpRoot, name);
    if (!existsSync(extractedBinary)) {
      throw new Error(`No se encontró el binario de ${displayName} en ${asset.file}`);
    }

    chmodSync(extractedBinary, 0o755);
    mkdirSync(installDir, { recursive: true });
    renameSync(extractedBinary, binaryPath);

    return binaryPath;
  } catch (error) {
    throw new Error(`Error al instalar ${displayName} automáticamente: ${(error as Error).message}`);
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
}

export function ensureTrivyInstalled(): string {
  return ensureToolInstalled('trivy');
}

export function ensureSyftInstalled(): string {
  return ensureToolInstalled('syft');
}

export function ensureGitleaksInstalled(): string {
  return ensureToolInstalled('gitleaks');
}

export function installAllTools(): void {
  for (const name of Object.keys(PINNED_TOOLS) as ToolName[]) {
    const path = ensureToolInstalled(name);
    console.log(`✅ ${DISPLAY_NAMES[name]} ${PINNED_TOOLS[name].version}: ${path}`);
  }
}
