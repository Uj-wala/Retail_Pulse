const REFRESH_TOKEN_KEY = "retailpulse_refresh_token";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(newAccessToken: string, newRefreshToken: string): void {
  accessToken = newAccessToken;
  localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
}

export function clearTokens(): void {
  accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
