import { useTheme } from "@/app/context/ThemeContext";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import AppText from "./TextSize";
import { readerDarkStyles, readerStyles } from "@/constants/styles";

// custom action item type matching gemini response schema
type ActionItem = {
    action_item: string;
    deadline?: string | null;
    completed: boolean;
}

// properties for action item modal
type Props = {
    visible: boolean;
    onClose: () => void;
    actionItems: ActionItem[];
    onAddItems?: (selectedItems: ActionItem[]) => void;
};

export default function ActionItemModal({
    visible,
    onClose,
    actionItems,
    onAddItems
}: Props) {
    const { darkMode } = useTheme();

    // dark mode tracking
    const C = useMemo(() => {
        const isDark = !!darkMode;
        return {
        overlay: "rgba(0,0,0,0.5)",
        modalBg: isDark ? "#2B2B2B" : "#FFFFFF",
        modalBorder: isDark ? "rgba(255,255,255,0.14)" : "#000000",

        title: isDark ? "#E5E7EB" : "#000000",
        subtitle: isDark ? "rgba(229,231,235,0.75)" : "#000000",

        listBg: isDark ? "#0F172A" : "#F8F4F9",
        listBorder: isDark ? "rgba(255,255,255,0.14)" : "#000000",

        checkboxBorder: isDark ? "#E5E7EB" : "#000000",
        checkboxBgChecked: isDark ? "rgba(255,255,255,0.12)" : "#EAEAEA",
        checkmark: isDark ? "#E5E7EB" : "#000000",

        itemText: isDark ? "#E5E7EB" : "#000000",
        deadlineText: isDark ? "rgba(229,231,235,0.65)" : "gray",
        emptyText: isDark ? "#E5E7EB" : "#000000",

        cancelBg: "#8C311C",
        cancelText: "#FFFFFF",

        addBgEnabled: "#9DB17C",
        addBgDisabled: isDark ? "rgba(255,255,255,0.18)" : "#B9B9B9",
        addTextEnabled: "#FFFFFF",
        addTextDisabled: isDark ? "rgba(229,231,235,0.55)" : "#FFFFFF",

        scrollIndicator: isDark ? "white" as const : "black" as const,
        };
    }, [darkMode]);

    // state to track selected items
    const [selectedItem, setSelectedItem] = useState<Set<number>>(new Set());
    // reset selected items when modal is opened or action items change
    useEffect(() => {
        if (visible) {
            setSelectedItem(new Set());
        }
    }, [visible, actionItems]);
    // check if any action items
    const hasItems = actionItems?.length > 0;
    // get selected items from selected indices
    const selectedItems = useMemo(() => {
        return Array.from(selectedItem).map(index => actionItems[index]).filter(Boolean);
    }, [selectedItem, actionItems]);
    // toggle item selection by index
    const toggleIndex = (index: number) => {
        setSelectedItem((prev) => {
            // create new set, no direct mutation
            const next = new Set(prev);
            // if index exists
            if (next.has(index)) {
                // remove it
                next.delete(index);
            }
            else {
                // otherwise add it
                next.add(index);
            }

            return next;
        });
    };
    // handle adding selected action items to to-do list
    const handleAddItem = () => {
        // if no callback, do nothing
        if (!onAddItems) {
            return;
        }
        // callback with selected items
        onAddItems(selectedItems);
        // close modal
        onClose();
    };


    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType='fade'
            onRequestClose={onClose}
        >
            <Pressable
                onPress={onClose}
                style={{
                    flex: 1,
                    backgroundColor: C.overlay,
                    justifyContent: 'center',
                    padding: 24
                }}
            >
                <Pressable
                    onPress={() => { }}
                    style={{
                        backgroundColor: C.modalBg,
                        borderRadius: 16,
                        padding: 18,
                        borderWidth: 2,
                        borderColor: C.modalBorder,
                        maxHeight: '50%'
                    }}
                >
                    <AppText style={{
                        color: C.title,
                        fontSize: 20,
                        fontWeight: '800',
                        textAlign: 'center'
                    }}>
                        Action Items
                    </AppText>
                    <AppText style={{ 
                        color: C.subtitle, 
                        fontSize: 14,
                        fontWeight: '600',
                        marginTop: 12, 
                        marginBottom: 12,
                        textAlign: 'center'
                    }}>
                        Check an item's box to add it to your To-Do List.
                    </AppText>

                    <ScrollView
                        style={{
                            backgroundColor: C.listBg,
                            borderColor: C.listBorder,
                            borderWidth: 1,
                            borderRadius: 12,
                        }}
                        indicatorStyle={C.scrollIndicator}
                    >
                        {/*display list of action items from to_do in user table db*/}
                        <View style={{
                            margin: 12,
                            gap: 8
                        }}>
                            {hasItems ? (
                                actionItems.map((item, index) => {
                                    const checked = selectedItem.has(index);
                                    return (
                                        <Pressable
                                            key={`${index}-${item}`}
                                            onPress={() => toggleIndex(index)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'flex-start',
                                                gap: 12,
                                                paddingVertical: 8
                                            }}
                                        >
                                            {/*checkbox*/}
                                            <View
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 6,
                                                    borderWidth: 2,
                                                    borderColor: C.checkboxBorder,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: checked ? C.checkboxBgChecked : 'transparent',
                                                    marginTop: 2
                                                }}
                                            >
                                                {checked ? (
                                                    <AppText
                                                        style={{
                                                            color: C.checkmark,
                                                            fontSize: 18,
                                                            fontWeight: '900',
                                                            lineHeight: 18
                                                        }}
                                                    >
                                                        ✓
                                                    </AppText>
                                                ) : null}
                                            </View>

                                            {/*action item and deadline*/}
                                            <AppText style={{ color: C.itemText, fontSize: 16, flex: 1 }}>
                                                {item.action_item} <AppText style={{ color: C.deadlineText, fontSize: 14}}>{item.deadline ? `by ${item.deadline}` : null}</AppText>
                                            </AppText>
                                        </Pressable>
                                    );
                                })
                            ) : (
                                <AppText style={{ color: C.emptyText, marginTop: 8 }}>
                                    No action items found.
                                </AppText>
                            )}
                        </View>
                    </ScrollView>
                    {/*buttons*/}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginTop: 18,
                            marginBottom: 12,
                            gap: 12
                        }}
                    >
                        <Pressable
                            onPress={onClose}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                borderRadius: 12,
                                backgroundColor: '#8C311C',
                                alignItems: 'center'
                            }}
                        >
                            <AppText style={{ color: 'white', fontWeight: '700' }}>
                                Cancel
                            </AppText>
                        </Pressable>

                        <Pressable
                            onPress={handleAddItem}
                            disabled={!onAddItems || selectedItems.length === 0}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                borderRadius: 12,
                                backgroundColor: !onAddItems || selectedItems.length === 0
                                    ? '#B9B9B9'
                                    : '#9DB17C',
                                alignItems: 'center'
                            }}
                        >
                            <AppText style={{ color: 'white', fontWeight: '700' }}>
                                Add Items
                            </AppText>
                        </Pressable>
                    </View>
                    <AppText style={[readerStyles.langPickerBtnText, darkMode && readerDarkStyles.langPickerBtnText]}>
                        Action items are generated by AI. Duplicate items may appear if the same document is scanned multiple times. Added items can be edited or deleted in the To-Do List.
                    </AppText>
                </Pressable>
            </Pressable>
        </Modal>
    );
}