import storage from "@/app/storage";
import React, { createContext, useContext, useMemo, useState } from "react";

const api_url = process.env.EXPO_PUBLIC_API_URL;

type ThemeContextValue = {
  darkMode: boolean;
  loadingTheme: boolean;
  refreshTheme: () => Promise<void>;
  setDarkMode: (next: boolean) => void;
  resetTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function getToken() {
    const token = await storage.getItem("access_token");
    const tokenType = (await storage.getItem("token_type")) || "bearer";
    return token ? { Authorization: `${tokenType} ${token}` } : {};
}

async function fetchDarkModeFlag(): Promise<boolean | null> {
    const headers = await getToken();
    if (!headers.Authorization) return null;

    const res = await fetch(`${api_url}/users/me/settings`, { headers });
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (!data) return null;

    return typeof data.dark_mode === "boolean" ? data.dark_mode : false;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkModeState] = useState(false);
    const [loadingTheme, setLoadingTheme] = useState(false);

    const refreshTheme = async () => {
        setLoadingTheme(true);
        try {
            const flag = await fetchDarkModeFlag();
            if (flag === null) {
                setDarkModeState(false);
                return;
            }
            setDarkModeState(flag);
        } catch (e) {
            console.warn("Unable to refresh theme:", e);
            setDarkModeState(false);            
        } finally {
            setLoadingTheme(false);
        }
    };

    const setDarkMode = (next: boolean) => setDarkModeState(!!next);

    const resetTheme = () => {
        setDarkModeState(false);
        setLoadingTheme(false);
    };

    const value = useMemo(() => ({ darkMode, loadingTheme, refreshTheme, setDarkMode, resetTheme }), [darkMode, loadingTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within AppThemeProvider");
    return ctx;
}