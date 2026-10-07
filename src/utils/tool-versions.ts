// Generado por scripts/update-tools.ts (npm run tools:update). No editar a mano.
// Versiones fijadas de las herramientas externas que descarga la CLI y el
// SHA-256 de cada archivo. Cualquier binario que no coincida se rechaza.

export type ToolName = 'trivy' | 'syft' | 'gitleaks';

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

export const PINNED_TOOLS: Record<ToolName, PinnedTool> = {
  "trivy": {
    "repo": "aquasecurity/trivy",
    "version": "0.74.0",
    "tag": "v0.74.0",
    "assets": {
      "darwin-arm64": {
        "file": "trivy_0.74.0_macOS-ARM64.tar.gz",
        "sha256": "1caada5e0e2091909357c7525d3aa76f4b660b13821bc143b190c7483e31cc11"
      },
      "darwin-x64": {
        "file": "trivy_0.74.0_macOS-64bit.tar.gz",
        "sha256": "472816f6888dda689d075c30254d4210b4d1035acf365aa72332f584c2f60485"
      },
      "linux-arm64": {
        "file": "trivy_0.74.0_Linux-ARM64.tar.gz",
        "sha256": "b94ce1976bbf3c15b514b605ee88be7c6d94a29be2302847ff01cb794d47aad5"
      },
      "linux-x64": {
        "file": "trivy_0.74.0_Linux-64bit.tar.gz",
        "sha256": "2ae6fe3ee734b7fdf11335663e18c75ea12dccc76062f09f164a3b0f8be4371a"
      }
    }
  },
  "syft": {
    "repo": "anchore/syft",
    "version": "1.52.0",
    "tag": "v1.52.0",
    "assets": {
      "darwin-arm64": {
        "file": "syft_1.52.0_darwin_arm64.tar.gz",
        "sha256": "014d561b6d13059124155f74a6c5a9a99501f5e209313638dd884f39eb418ee6"
      },
      "darwin-x64": {
        "file": "syft_1.52.0_darwin_amd64.tar.gz",
        "sha256": "56975f5d7ffa9846a1eaf64330647841b878097bc7e3730cb9325f93add96917"
      },
      "linux-arm64": {
        "file": "syft_1.52.0_linux_arm64.tar.gz",
        "sha256": "c46d5e4c28e12aa4c5becfaa343ef1c7f89045b6b895f2c21d471c62db09c706"
      },
      "linux-x64": {
        "file": "syft_1.52.0_linux_amd64.tar.gz",
        "sha256": "caeedb81fb0491615f1ebd1761e4145d41ee86dd2cc7bf80669f9f5ad9d6133d"
      }
    }
  },
  "gitleaks": {
    "repo": "gitleaks/gitleaks",
    "version": "8.30.1",
    "tag": "v8.30.1",
    "assets": {
      "darwin-arm64": {
        "file": "gitleaks_8.30.1_darwin_arm64.tar.gz",
        "sha256": "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5"
      },
      "darwin-x64": {
        "file": "gitleaks_8.30.1_darwin_x64.tar.gz",
        "sha256": "dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709"
      },
      "linux-arm64": {
        "file": "gitleaks_8.30.1_linux_arm64.tar.gz",
        "sha256": "e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080"
      },
      "linux-x64": {
        "file": "gitleaks_8.30.1_linux_x64.tar.gz",
        "sha256": "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
      }
    }
  }
};
