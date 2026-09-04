import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform, arch } from 'node:os';

export function ensureTrivyInstalled(): string {
  // Directorio local para guardar dependencias de tu CLI
  const binDir = join(homedir(), '.gitops-cli', 'bin');
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

export function ensureSyftInstalled(): string {
  const binDir = join(homedir(), '.gitops-cli', 'bin');
  const syftPath = join(binDir, 'syft');

  if (existsSync(syftPath)) {
    return syftPath;
  }

  console.log('Instalando Syft por primera vez...');
  mkdirSync(binDir, { recursive: true });

  const installCmd = `curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b "${binDir}"`;

  try {
    execSync(installCmd, { stdio: 'inherit' });
    return syftPath;
  } catch (error) {
    throw new Error(`Error al instalar Syft automáticamente: ${(error as Error).message}`);
  }
}

export function ensureGitleaksInstalled(): string {
  const binDir = join(homedir(), '.gitops-cli', 'bin');
  const gitleaksPath = join(binDir, 'gitleaks');

  if (existsSync(gitleaksPath)) {
    return gitleaksPath;
  }

  console.log('Instalando Gitleaks por primera vez...');
  mkdirSync(binDir, { recursive: true });

  const osName = platform();
  const archName = arch();

  let assetSuffix: string;
  switch (`${osName}-${archName}`) {
    case 'darwin-x64':
      assetSuffix = 'darwin_x64';
      break;
    case 'darwin-arm64':
      assetSuffix = 'darwin_arm64';
      break;
    case 'linux-x64':
      assetSuffix = 'linux_x64';
      break;
    case 'linux-arm64':
      assetSuffix = 'linux_arm64';
      break;
    default:
      throw new Error(`Arquitectura no soportada para Gitleaks: ${osName}-${archName}`);
  }

  const tmpRoot = join(binDir, `gitleaks-install-${Date.now()}`);
  const tmpArchive = join(tmpRoot, 'gitleaks.tar.gz');

  try {
    mkdirSync(tmpRoot, { recursive: true });

    const latestRelease = JSON.parse(
      execSync('curl -fsSL https://api.github.com/repos/gitleaks/gitleaks/releases/latest', { encoding: 'utf8' })
    );

    const tag = String(latestRelease.tag_name || 'v8.0.0');
    const version = tag.replace(/^v/, '');
    const archiveName = `gitleaks_${version}_${assetSuffix}.tar.gz`;
    const archiveUrl = `https://github.com/gitleaks/gitleaks/releases/download/${tag}/${archiveName}`;

    execSync(`curl -fsSL "${archiveUrl}" -o "${tmpArchive}"`, { stdio: 'inherit' });
    execSync(`tar -xzf "${tmpArchive}" -C "${tmpRoot}"`, { stdio: 'inherit' });

    const extractedBinary = join(tmpRoot, 'gitleaks');
    if (!existsSync(extractedBinary)) {
      throw new Error(`No se encontró el binario de Gitleaks extraído en ${tmpRoot}`);
    }

    execSync(`cp "${extractedBinary}" "${gitleaksPath}" && chmod +x "${gitleaksPath}"`, { stdio: 'inherit' });

    if (!existsSync(gitleaksPath)) {
      throw new Error('Gitleaks no se instaló correctamente en la ruta esperada.');
    }

    return gitleaksPath;
  } catch (error) {
    throw new Error(`Error al instalar Gitleaks automáticamente: ${(error as Error).message}`);
  } finally {
    try {
      execSync(`rm -rf "${tmpRoot}"`, { stdio: 'inherit' });
    } catch {
      // Ignorar limpieza final si falla.
    }
  }
}