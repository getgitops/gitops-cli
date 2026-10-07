/**
 * Regenera src/utils/tool-versions.ts con las versiones fijadas de las
 * herramientas externas (trivy, syft, gitleaks) y el SHA-256 de cada archivo.
 *
 * Uso:
 *   npm run tools:update                                   # muestra fijadas vs. disponibles
 *   npm run tools:update -- trivy=0.75.0 syft=1.54.0       # fija nuevas versiones
 *   npm run tools:update -- trivy=0.75.0 --allow-recent    # ignora la antigüedad mínima
 *
 * Por defecto se rechazan releases con menos de MIN_RELEASE_AGE_DAYS días para
 * dar margen a que se detecte una release comprometida antes de adoptarla.
 * Define GITHUB_TOKEN para evitar el rate limit de la API de GitHub.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PinnedTool, ToolName } from '../src/utils/tool-versions';

const MIN_RELEASE_AGE_DAYS = 7;
const OUTPUT_FILE = join(__dirname, '..', 'src', 'utils', 'tool-versions.ts');

type Platform = 'darwin-arm64' | 'darwin-x64' | 'linux-arm64' | 'linux-x64';

interface ToolSpec {
  repo: string;
  archive: (version: string, platformSuffix: string) => string;
  checksums: (version: string) => string;
  platforms: Record<Platform, string>;
}

const SPECS: Record<ToolName, ToolSpec> = {
  trivy: {
    repo: 'aquasecurity/trivy',
    archive: (v, p) => `trivy_${v}_${p}.tar.gz`,
    checksums: (v) => `trivy_${v}_checksums.txt`,
    platforms: {
      'darwin-arm64': 'macOS-ARM64',
      'darwin-x64': 'macOS-64bit',
      'linux-arm64': 'Linux-ARM64',
      'linux-x64': 'Linux-64bit',
    },
  },
  syft: {
    repo: 'anchore/syft',
    archive: (v, p) => `syft_${v}_${p}.tar.gz`,
    checksums: (v) => `syft_${v}_checksums.txt`,
    platforms: {
      'darwin-arm64': 'darwin_arm64',
      'darwin-x64': 'darwin_amd64',
      'linux-arm64': 'linux_arm64',
      'linux-x64': 'linux_amd64',
    },
  },
  gitleaks: {
    repo: 'gitleaks/gitleaks',
    archive: (v, p) => `gitleaks_${v}_${p}.tar.gz`,
    checksums: (v) => `gitleaks_${v}_checksums.txt`,
    platforms: {
      'darwin-arm64': 'darwin_arm64',
      'darwin-x64': 'darwin_x64',
      'linux-arm64': 'linux_arm64',
      'linux-x64': 'linux_x64',
    },
  },
};

const TOOL_NAMES = Object.keys(SPECS) as ToolName[];

interface GithubRelease {
  tag_name: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; digest?: string | null; browser_download_url: string }[];
}

async function github<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${path}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

function ageInDays(publishedAt: string): number {
  return (Date.now() - new Date(publishedAt).getTime()) / 86_400_000;
}

async function loadCurrent(): Promise<Partial<Record<ToolName, PinnedTool>>> {
  try {
    return (await import('../src/utils/tool-versions')).PINNED_TOOLS;
  } catch {
    return {};
  }
}

async function showStatus(current: Partial<Record<ToolName, PinnedTool>>) {
  for (const name of TOOL_NAMES) {
    const releases = await github<GithubRelease[]>(`/repos/${SPECS[name].repo}/releases?per_page=20`);
    const stable = releases.filter((r) => !r.draft && !r.prerelease);
    const latest = stable[0];
    const eligible = stable.find((r) => ageInDays(r.published_at) >= MIN_RELEASE_AGE_DAYS);
    const fmt = (r?: GithubRelease) =>
      r ? `${r.tag_name.replace(/^v/, '')} (${Math.floor(ageInDays(r.published_at))}d)` : '-';

    console.log(
      `${name.padEnd(9)} fijada: ${(current[name]?.version ?? '-').padEnd(10)} ` +
        `última: ${fmt(latest).padEnd(16)} última con >=${MIN_RELEASE_AGE_DAYS}d: ${fmt(eligible)}`,
    );
  }
  console.log('\nPara actualizar: npm run tools:update -- <tool>=<versión> [...]');
}

async function resolveTool(name: ToolName, version: string, allowRecent: boolean): Promise<PinnedTool> {
  const spec = SPECS[name];
  const tag = `v${version}`;
  const release = await github<GithubRelease>(`/repos/${spec.repo}/releases/tags/${tag}`);

  if (release.draft || release.prerelease) {
    throw new Error(`${name} ${tag} es draft/prerelease`);
  }
  const age = ageInDays(release.published_at);
  if (age < MIN_RELEASE_AGE_DAYS && !allowRecent) {
    throw new Error(
      `${name} ${tag} se publicó hace ${age.toFixed(1)} días (< ${MIN_RELEASE_AGE_DAYS}). ` +
        'Usa --allow-recent si de verdad quieres fijarla.',
    );
  }

  const checksumsAsset = release.assets.find((a) => a.name === spec.checksums(version));
  if (!checksumsAsset) {
    throw new Error(`${name} ${tag}: no se encontró ${spec.checksums(version)}`);
  }
  const checksumsRes = await fetch(checksumsAsset.browser_download_url);
  if (!checksumsRes.ok) {
    throw new Error(`${name} ${tag}: no se pudo descargar ${checksumsAsset.name}`);
  }
  const checksums = new Map<string, string>();
  for (const line of (await checksumsRes.text()).split('\n')) {
    const [hash, file] = line.trim().split(/\s+/);
    if (hash && file) checksums.set(file.replace(/^\*/, ''), hash.toLowerCase());
  }

  const assets: PinnedTool['assets'] = {};
  for (const [platformKey, suffix] of Object.entries(spec.platforms)) {
    const file = spec.archive(version, suffix);
    const sha256 = checksums.get(file);
    if (!sha256 || !/^[a-f0-9]{64}$/.test(sha256)) {
      throw new Error(`${name} ${tag}: falta el checksum de ${file}`);
    }
    // GitHub calcula su propio digest al subir el asset; debe coincidir con el checksums.txt.
    const githubDigest = release.assets.find((a) => a.name === file)?.digest;
    if (githubDigest && githubDigest !== `sha256:${sha256}`) {
      throw new Error(`${name} ${tag}: el checksum de ${file} no coincide con el digest de GitHub`);
    }
    assets[platformKey] = { file, sha256 };
  }

  console.log(`✔ ${name} ${version} (publicada hace ${Math.floor(age)} días)`);
  return { repo: spec.repo, version, tag, assets };
}

function render(tools: Record<ToolName, PinnedTool>): string {
  return `// Generado por scripts/update-tools.ts (npm run tools:update). No editar a mano.
// Versiones fijadas de las herramientas externas que descarga la CLI y el
// SHA-256 de cada archivo. Cualquier binario que no coincida se rechaza.

export type ToolName = ${TOOL_NAMES.map((n) => `'${n}'`).join(' | ')};

export interface ToolAsset {
  file: string;
  sha256: string;
}

export interface PinnedTool {
  repo: string;
  version: string;
  tag: string;
  assets: Record<string, ToolAsset>;
}

export const PINNED_TOOLS: Record<ToolName, PinnedTool> = ${JSON.stringify(tools, null, 2)};
`;
}

async function main() {
  const args = process.argv.slice(2);
  const allowRecent = args.includes('--allow-recent');
  const requested = new Map<ToolName, string>();

  for (const arg of args.filter((a) => !a.startsWith('--'))) {
    const [name, version] = arg.split('=');
    if (!TOOL_NAMES.includes(name as ToolName) || !version) {
      throw new Error(`Argumento inválido "${arg}". Formato: <${TOOL_NAMES.join('|')}>=<versión>`);
    }
    requested.set(name as ToolName, version.replace(/^v/, ''));
  }

  const current = await loadCurrent();
  if (requested.size === 0) {
    await showStatus(current);
    return;
  }

  const next = {} as Record<ToolName, PinnedTool>;
  for (const name of TOOL_NAMES) {
    const version = requested.get(name);
    if (version) {
      next[name] = await resolveTool(name, version, allowRecent);
    } else if (current[name]) {
      next[name] = current[name]!;
    } else {
      throw new Error(`${name} no tiene versión fijada; pásala como ${name}=<versión>`);
    }
  }

  writeFileSync(OUTPUT_FILE, render(next));
  console.log(`\nActualizado ${OUTPUT_FILE}. Recuerda publicar una nueva versión del paquete.`);
}

main().catch((error) => {
  console.error(`❌ ${(error as Error).message}`);
  process.exit(1);
});
