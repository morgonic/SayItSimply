import React, { useEffect, useMemo, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";

type Props = {
    visible: boolean;
    onClose: () => void;
    actionItems: string[];
    onAddItems?: (selectedItems: string[]) => void;
};

export default function ActionItemModal({
    visible,
    onClose,
    actionItems,
    onAddItems
}: Props) {

    const [selectedItem, setSelectedItem] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (visible) {
            setSelectedItem(new Set());
        }
    }, [visible, actionItems]);

    const hasItems = actionItems?.length > 0;

    const selectedItems = useMemo(() => {
        return Array.from(selectedItem).map(index => actionItems[index]).filter(Boolean);
    }, [selectedItem, actionItems]);

    const toggleIndex = (index: number) => {
        setSelectedItem((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            }
            else {
                next.add(index);
            }

            return next;
        });
    };

    const handleAddItem = () => {
        if (!onAddItems) {
            return;
        }

        onAddItems(selectedItems);
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
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    padding: 24
                }}
            >
                <Pressable
                    onPress={() => { }}
                    style={{
                        backgroundColor: '#ECC8AF',
                        borderRadius: 16,
                        padding: 18,
                        borderWidth: 2,
                        borderColor: '#000000',
                        maxHeight: '50%'
                    }}
                >
                    <Text style={{
                        color: 'black',
                        fontSize: 20,
                        fontWeight: '800',
                        textAlign: 'center'
                    }}>
                        Action Items
                    </Text>
                    <Text style={{ 
                        color: 'black', 
                        fontSize: 14,
                        fontWeight: '600',
                        marginTop: 12, 
                        marginBottom: 12,
                        textAlign: 'center'
                    }}>
                        Check an item's box to add it to your To-Do List.
                    </Text>

                    <ScrollView
                        style={{
                            backgroundColor: '#F8F4F9',
                            borderColor: '#000000',
                            borderWidth: 1,
                            borderRadius: 12,
                        }}
                        indicatorStyle="black"
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
                                                    borderColor: 'black',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: checked ? '#EAEAEA' : 'transparent',
                                                    marginTop: 2
                                                }}
                                            >
                                                {checked ? (
                                                    <Text
                                                        style={{
                                                            color: 'black',
                                                            fontSize: 18,
                                                            fontWeight: '900',
                                                            lineHeight: 18
                                                        }}
                                                    >
                                                        ✓
                                                    </Text>
                                                ) : null}
                                            </View>

                                            {/*item text*/}
                                            <Text style={{ color: 'black', fontSize: 16, flex: 1 }}>
                                                {item}
                                            </Text>
                                        </Pressable>
                                    );
                                })
                            ) : (
                                <Text style={{ color: 'black', marginTop: 8 }}>
                                    No action items found.
                                </Text>
                            )}
                        </View>
                    </ScrollView>
                    {/*buttons*/}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginTop: 18,
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
                            <Text style={{ color: 'white', fontWeight: '700' }}>
                                Cancel
                            </Text>
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
                            <Text style={{ color: 'white', fontWeight: '700' }}>
                                Add Items
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}