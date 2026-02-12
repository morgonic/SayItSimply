import storage from "@/app/storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type TextSizeValues = "XS" | "S" | "M" | "L" | "XL";

type TextSizeContextValue = {
  textSize: TextSizeValues;
  scale: number;
  setTextSize: (next: TextSizeValues) => Promise<void>;
  hydrated: boolean;
};

const DEFAULT_TEXT_SIZE: TextSizeValues = "M";
const SIZE_MAP: Record<TextSizeValues, number> = {
    XS: 0.50,
    S: 0.75,
    M: 1.0,
    L: 1.25,
    XL: 1.50
};

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
    const [textSize, _setTextSize] = useState<TextSizeValues>(DEFAULT_TEXT_SIZE);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        (async () => {
        try {
            const cached = await storage.getItem("text_size");
            if (cached === "XS" || cached === "S" || cached === "M" || cached === "L" || cached === "XL") {
            _setTextSize(cached);
            }
        } finally {
            setHydrated(true);
        }
        })();
    }, []);

    const setTextSize = async (next: TextSizeValues) => {
        _setTextSize(next);
        await storage.setItem("text_size", next);
    };

    const value = useMemo<TextSizeContextValue>(() => {
        return {
            textSize,
            scale: SIZE_MAP[textSize] ?? 1.0,
            setTextSize,
            hydrated
        };
    }, [textSize, hydrated]);
    return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>;
}

export function useTextSize() {
    const c = useContext(TextSizeContext);
    if (!c) throw new Error("useTextSize has to be called within TextSizeProvider");
    return c;
}