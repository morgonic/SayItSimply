import storage from "@/app/storage";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const api_url = process.env.EXPO_PUBLIC_API_URL;

type ThemeContextValue = {
  darkMode: boolean;
  loadingTheme: boolean;
  refreshTheme: () => Promise<void>;
  setDarkMode: (next: boolean) => void;
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

    return Boolean(data.dark_mode);
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
    const deviceScheme = useColorScheme();
    const [darkMode, setDarkModeState] = useState(deviceScheme === "dark");
    const [loadingTheme, setLoadingTheme] = useState(true);

    const refreshTheme = async () => {
        try {
        const flag = await fetchDarkModeFlag();
        if (flag !== null) setDarkModeState(flag);
        } finally {
        setLoadingTheme(false);
        }
    };
    const setDarkMode = (next: boolean) => setDarkModeState(next);

    useEffect(() => {
        refreshTheme();
    }, []);

    const value = useMemo(() => ({ darkMode, loadingTheme, refreshTheme, setDarkMode }), [darkMode, loadingTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within AppThemeProvider");
    return ctx;
}