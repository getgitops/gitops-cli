
export const authApiKey = async (apiUrl: string, apiKey: string): Promise<boolean> => {
    // Implement your API key authentication logic here
        // --- Petición 1: Auth ---
    console.log('🔒 [1/2] Autenticando con la API...');
    const authResponse = await fetch(`${apiUrl}/auth/me`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ apiKey }),
    });

    if (!authResponse.ok) {
        throw new Error(`Error en autenticación (${authResponse.status}): ${await authResponse.text()}`);
    }

    const authData = (await authResponse.json()) as any;
    // const authToken = authData.token || apiKey;
    return true;
}