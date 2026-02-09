import React, { useEffect, useMemo, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { readerStyles } from '@/constants/styles';

// modal props
type Props = {
    visible: boolean;
    onClose: () => void;
}

export default function HelpModal({
    visible,
    onClose
}: Props) {

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
                    padding: 48
                }}
            >
                <Pressable
                    onPress={() => { }}
                    style={{
                        backgroundColor: '#F8F4F9',
                        borderRadius: 16,
                        padding: 18,
                        borderWidth: 2,
                        borderColor: '#000000',
                        maxHeight: '50%'
                    }}
                >
                    <Text style={readerStyles.helpHeaderText}>
                        Language Codes
                    </Text>

                    <View style={{
                        justifyContent: 'center',
                        marginLeft: 36,
                        marginTop: 36,
                        marginBottom: 12
                    }}>
                        {/* EN / English */}
                        <View style={{flexDirection: 'row'}}>
                            <View style={{backgroundColor: '#8C311C', borderRadius: 8, width: 32, height: 32}}>
                                <Text style={{ color: '#F2D3AC', fontWeight: '800', lineHeight: 32, textAlign: 'center'}}>EN</Text>
                            </View>
                            <Text style={readerStyles.bodyText}> English</Text>
                        </View>
                        <View style={{height: 12}}/>

                        {/* ES / Español (Spanish) */}
                        <View style={{flexDirection: 'row'}}>
                            <View style={{backgroundColor: '#8C311C', borderRadius: 8, width: 32, height: 32}}>
                                <Text style={{ color: '#F2D3AC', fontWeight: '800', lineHeight: 32, textAlign: 'center'}}>ES</Text>
                            </View>
                            <Text style={readerStyles.bodyText}> Español</Text>
                        </View>
                        <View style={{height: 12}}/>

                        {/* FR / Français (French) */}
                        <View style={{flexDirection: 'row'}}>
                            <View style={{backgroundColor: '#8C311C', borderRadius: 8, width: 32, height: 32}}>
                                <Text style={{ color: '#F2D3AC', fontWeight: '800', lineHeight: 32, textAlign: 'center'}}>FR</Text>
                            </View>
                            <Text style={readerStyles.bodyText}> Français</Text>
                        </View>
                        <View style={{height: 12}}/>

                        {/* DE / Deutsch (German) */}
                        <View style={{flexDirection: 'row'}}>
                            <View style={{backgroundColor: '#8C311C', borderRadius: 8, width: 32, height: 32}}>
                                <Text style={{ color: '#F2D3AC', fontWeight: '800', lineHeight: 32, textAlign: 'center'}}>DE</Text>
                            </View>
                            <Text style={readerStyles.bodyText}> Deutsch</Text>
                        </View>
                        <View style={{height: 12}}/>
                    </View>

                </Pressable>
            </Pressable>
        </Modal>
    )
}