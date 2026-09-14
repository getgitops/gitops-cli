import { Command } from '../command';

export class VaultSecretCommand extends Command {
  async create() {
    const secret = await this.callApi('vault/secret', 'POST', {
      projectId: this.params.projectId,
      path: this.params.path,
      key: this.params.key,
      values: { [this.params.env]: this.params.value },
      ...(this.params.description ? { description: this.params.description } : {}),
    });
    console.log(JSON.stringify(secret, null, 2));
  }

  async get() {
    const secret = await this.callApi(this.secretEndpoint(), 'GET', this.secretQuery());
    console.log(JSON.stringify(secret, null, 2));
  }

  async update() {
    const secret = await this.callApi(this.secretEndpointWithQuery(), 'PATCH', {
      environment: this.params.env,
      value: this.params.value,
      ...(this.params.description ? { description: this.params.description } : {}),
    });
    console.log(JSON.stringify(secret, null, 2));
  }

  async delete() {
    const result = await this.callApi(this.secretEndpointWithQuery(), 'DELETE');
    console.log(JSON.stringify(result, null, 2));
  }

  private secretEndpoint() {
    return `vault/secret/${encodeURIComponent(this.params.key)}`;
  }

  private secretQuery() {
    return { projectId: this.params.projectId, path: this.params.path };
  }

  private secretEndpointWithQuery() {
    return `${this.secretEndpoint()}?${new URLSearchParams(this.secretQuery()).toString()}`;
  }
}