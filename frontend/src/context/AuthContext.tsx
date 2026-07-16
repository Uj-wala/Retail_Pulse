import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/authApi";
import { profileApi } from "../api/profileApi";
import { clearTokens, getRefreshToken, setTokens } from "../utils/tokenStore";
import type { TokenResponse, User } from "../types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: TokenResponse) => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }
      try {
        const tokens = await authApi.refresh(refreshToken);
        setTokens(tokens.access_token, tokens.refresh_token);
        const profile = await profileApi.getProfile();
        if (!cancelled) setUser(profile.user);
      } catch {
        clearTokens();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = (tokens: TokenResponse) => {
    setTokens(tokens.access_token, tokens.refresh_token);
    setUser(tokens.user);
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore network errors during logout - clear local state regardless.
      }
    }
    clearTokens();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
      setUser,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
