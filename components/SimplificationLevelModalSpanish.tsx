import React from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";

type Props = {
    visible: boolean;
    onClose: () => void;
};

export default function SimplificationLevelModalSpanish({ visible, onClose }: Props) {
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
                            Niveles de Simplificación
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
                                    Más cercano al texto original.
                                </Text>
                                <Text style={{
                                    color: "black",
                                    fontSize: 16,
                                    opacity: 0.9
                                }}>
                                    Conserva la mayoría de los detalles.
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
                                    Frases más cortas, palabras más comunes.
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
                                    Frases muy cortas, palabras muy comunes. Muy fácil de leer.
                                </Text>
                            </View>
                        </View>                        
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    )
}