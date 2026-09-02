
import { camelToSnake } from '../utils/helpers';

export class Command {
    params: any;
    protected apiURL: string;
    constructor(params: any) {
        this.params = Object.keys(params).reduce((acc: any, param: string) => {
            acc[param] = process.env[camelToSnake(param).toUpperCase()] || params[param];
            return acc;
        }, {});
        this.apiURL = this.formatApiUrl();
    }

    callApi(endpoint: string, method: string, body?: any) {
        const url = `${this.apiURL}/${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.params.apiKey || ''}`,
        };
        // console.log('Headers', headers);
        const result = fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        }).then(async (response) => {
            if (!response.ok) {
                // const errorText = await response.json();
                throw new Error(`API response with status ${response.status}`);
            }
            return response.json();
        }).catch((error) => {
            throw new Error(error.message);
        });
        return result;
    }

    private formatApiUrl() {
        if (!this.params.apiUrl) {
            throw new Error('ENV API_URL is not defined or provided in the configuration file or command line arguments.');
        }
        return this.params.apiUrl.replace(/\/$/, '');
    }
}