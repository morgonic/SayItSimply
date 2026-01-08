import React from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";

type Props = {
    visible: boolean;
    onClose: () => void;
};

export default function SimplificationLevelModal({ visible, onClose }: Props) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                onPress={onClose}
                style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "center",
                    padding: 24
                }}
            >
                <Pressable
                    onPress={() => {}}
                    style={{
                        backgroundColor: "#D9D9D9",
                        borderRadius: 16,
                        padding: 18,
                        borderWidth: 2,
                        borderColor: "#6C6767",
                        maxHeight: "80%"
                    }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
                        <Pressable
                            onPress={() => {}}
                            style={{
                                height: 48,
                                width: 48,
                                marginBottom: 12,
                                backgroundColor: "#D9D9D9",
                                borderRadius: 24,
                                borderWidth: 2,
                                borderColor: "#6C6767",
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            disabled={true}
                        >
                            <Text style={{color: "black", fontWeight: '800', fontSize: 28}}>?</Text>
                        </Pressable>

                        <View style={{ width: 12 }} />
                        
                        <Text style={{
                            color: "black",
                            fontSize: 24,
                            fontWeight: "700",
                            marginBottom: 12,
                            textAlign: 'center'
                        }}>
                            Simplification Levels
                        </Text>
                    </View>
                        

                    <ScrollView>
                        <View style={{flexDirection: 'row', marginBottom: 12}}>
                            {/*blue circle*/}
                            <View style={{
                                height: 24,
                                width: 24,
                                borderRadius: 12,
                                backgroundColor: "#277A8C",
                                marginTop: 8,
                                marginRight: 12,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}/>
                            <View style={{flexDirection: 'column'}}>
                                <Text style={{
                                    color: "black",
                                    fontSize: 18,
                                    fontWeight: "700",
                                    marginTop: 8,
                                    marginBottom: 8,
                                    textDecorationLine: 'underline'
                                }}>
                                    Standard
                                </Text>
                                <Text style={{
                                    color: "black",
                                    fontSize: 16,
                                    opacity: 0.9,
                                    marginTop: 4
                                }}>
                                    Closest to the original text.
                                </Text>
                                <Text style={{
                                    color: "black",
                                    fontSize: 16,
                                    opacity: 0.9
                                }}>
                                    Keeps most details.
                                </Text>
                            </View>
                        </View>

                        <View style={{flexDirection: 'row', marginBottom: 12}}>
                            {/*blue circle*/}
                            <View style={{
                                height: 24,
                                width: 24,
                                borderRadius: 12,
                                backgroundColor: "#277A8C",
                                marginTop: 8,
                                marginRight: 12,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}/>
                            <View style={{flexDirection: 'column'}}>
                                <Text style={{
                                    color: "black",
                                    fontSize: 18,
                                    fontWeight: "700",
                                    marginTop: 8,
                                    marginBottom: 8,
                                    textDecorationLine: 'underline'
                                }}>
                                    Simple
                                </Text>
                                <Text style={{
                                    color: "black",
                                    fontSize: 16,
                                    opacity: 0.9,
                                    marginTop: 4
                                }}>
                                    Shorter sentences, more common words.
                                </Text>
                            </View>
                        </View>

                        <View style={{flexDirection: 'row', marginBottom: 12}}>
                            {/*blue circle*/}
                            <View style={{
                                height: 24,
                                width: 24,
                                borderRadius: 12,
                                backgroundColor: "#277A8C",
                                marginTop: 8,
                                marginRight: 12,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}/>
                            <View style={{flexDirection: 'column'}}>
                                <Text style={{
                                    color: "black",
                                    fontSize: 18,
                                    fontWeight: "700",
                                    marginTop: 8,
                                    marginBottom: 8,
                                    textDecorationLine: 'underline'
                                }}>
                                    Super Simple
                                </Text>
                                <Text style={{
                                    color: "black",
                                    fontSize: 16,
                                    opacity: 0.9,
                                    marginTop: 4,
                                    marginBottom: 8
                                }}>
                                    Very short sentences, very common words. Easiest to read.
                                </Text>
                            </View>
                        </View>                        
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    )
}