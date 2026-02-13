import { useTextSize } from "@/app/context/TextSizeContext";
import React, { useMemo } from "react";
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from "react-native";

type Props = TextProps & {
  style?: StyleProp<TextStyle>;
  defSize?: number;
};

export default function AppText({ style, defSize = 14, ...props }: Props) {
    const { scale } = useTextSize();
    const computedStyle = useMemo(() => {
        const flat = StyleSheet.flatten(style) || ({} as TextStyle);

        const fontSize = typeof flat.fontSize === "number" ? flat.fontSize : defSize;
        const lineHeight =
        typeof flat.lineHeight === "number"
            ? flat.lineHeight
            : undefined;

        const { fontSize: _fs, lineHeight: _lh, ...rest } = flat;

        const scaled: TextStyle = {
        ...rest,
        fontSize: Math.round(fontSize * scale),
        ...(lineHeight != null ? { lineHeight: Math.round(lineHeight * scale) } : null)
        };
        return scaled;
    }, [style, defSize, scale]);
    return <Text {...props} style={computedStyle}/>;
}