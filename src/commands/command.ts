
import { camelToSnake } from '../utils/helpers';

export class Command {
    params: any;
    protected apiURL: string;
    constructor(params: any) {
        this.params = Object.keys(params).reduce((acc: any, param: string) => {
            acc[param] = params[param] ?? process.env[camelToSnake(param).toUpperCase()];
            return acc;
        }, {});
        this.apiURL = this.formatApiUrl();
    }

    async callApi(endpoint: string, method: string, body?: any, responseType: 'json' | 'text' = 'json') {
        const url = new URL(`${this.apiURL}/${endpoint}`);
        const isGet = method.toUpperCase() === 'GET';
        if (isGet && body) {
            for (const [key, value] of Object.entries(body)) {
                url.searchParams.set(key, String(value));
            }
        }
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.params.apiKey || ''}`,
        };
        const response = await fetch(url, {
            method,
            headers,
            body: !isGet && body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || `API response with status ${response.status}`);
        }
        return responseType === 'text' ? response.text() : response.json();
    }

    private formatApiUrl() {
        if (!this.params.apiUrl) {
            throw new Error('ENV API_URL is not defined or provided in the configuration file or command line arguments.');
        }
        return this.params.apiUrl.replace(/\/$/, '');
    }
}