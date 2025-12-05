import { RNPlugin } from '@remnote/plugin-sdk';

const REDIRECT_URI = 'http://127.0.0.1:42813/callback'; // Configured in Google Cloud Console
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
}

export const initiateAuth = async (plugin: RNPlugin, clientId: string) => {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline', // Request refresh token
        prompt: 'consent', // Force consent prompt to ensure we get a refresh token
    });

    const url = `${AUTH_URL}?${params.toString()}`;
    await plugin.app.toast("Opening Google Login in browser...");
    window.open(url, '_blank');
};

export const exchangeCodeForToken = async (
    plugin: RNPlugin,
    clientId: string,
    clientSecret: string,
    code: string
) => {
    try {
        const params = new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token exchange failed: ${errorText}`);
        }

        const data: TokenResponse = await response.json();
        await saveTokens(plugin, data);
        return true;
    } catch (e) {
        console.error('Failed to exchange code for token', e);
        await plugin.app.toast(`Login failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        return false;
    }
};

const saveTokens = async (plugin: RNPlugin, tokens: TokenResponse) => {
    await plugin.storage.setSynced('access_token', tokens.access_token);
    if (tokens.refresh_token) {
        await plugin.storage.setSynced('refresh_token', tokens.refresh_token);
    }
    // Calculate expiry time
    const expiryTime = Date.now() + tokens.expires_in * 1000;
    await plugin.storage.setSynced('token_expiry', expiryTime);
}

export const getAccessToken = async (plugin: RNPlugin, clientId: string, clientSecret: string): Promise<string | null> => {
    const accessToken = await plugin.storage.getSynced('access_token');
    const expiryTime = await plugin.storage.getSynced('token_expiry');

    if (!accessToken) return null;

    if (expiryTime && Date.now() > (expiryTime as number - 60000)) { // Refresh 1 minute before expiry
        return await refreshAccessToken(plugin, clientId, clientSecret);
    }

    return accessToken as string;
}

const refreshAccessToken = async (plugin: RNPlugin, clientId: string, clientSecret: string): Promise<string | null> => {
    const refreshToken = await plugin.storage.getSynced('refresh_token');
    if (!refreshToken) {
        await plugin.app.toast("Session expired. Please login again.");
        return null;
    }

    try {
        const params = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken as string,
            grant_type: 'refresh_token',
        });

        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data: TokenResponse = await response.json();
        await saveTokens(plugin, data);
        return data.access_token;

    } catch (e) {
        console.error("Token refresh failed", e);
        await plugin.app.toast("Failed to refresh session. Please login again.");
        return null;
    }
}
