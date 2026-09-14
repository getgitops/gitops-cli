import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command } from '../command';

type ExportFormat = 'env' | 'json';

function validateFormat(format: string): asserts format is ExportFormat {
	if (format !== 'env' && format !== 'json') {
		throw new Error("format must be 'env' or 'json'");
	}
}

export class VaultExportCommand extends Command {
	async execute() {
		validateFormat(this.params.format);
		const content = await this.callApi(
			'vault/export',
			'GET',
			{
				projectId: this.params.projectId,
				path: this.params.path,
				env: this.params.env,
				format: this.params.format,
			},
			'text',
		);
		const output = resolve(process.cwd(), this.params.output);

		await writeFile(output, content, 'utf8');
		console.log(`Vault secrets exported to ${output}`);
	}
}
