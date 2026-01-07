import { View, Image, Text } from "react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import RadioGroup, { RadioButtonProps } from 'react-native-radio-buttons-group';
import { styles } from '@/constants/styles';

export default function OnboardingScreen() {
  
  const router = useRouter();

  const languageButtons: RadioButtonProps[] = useMemo(() => ([
    {
        id: '1',
        label: 'English',
        accessibilityLabel: 'English',
        value: 'en',
        borderColor: '#6C6767',
        color: '#277A8C',
        containerStyle: styles.radioButtonContainer,
        size: 30,
        labelStyle: { fontWeight: '600' }
    },
    {
        id: '2',
        label: 'Español',
        accessibilityLabel: 'Español',
        value: 'es',
        borderColor: '#6C6767',
        color: '#277A8C',
        containerStyle: styles.radioButtonContainer,
        size: 30,
        labelStyle: { fontWeight: '600' }
    }
  ]), []);

  const simpButtons: RadioButtonProps[] = useMemo(() => ([
    {
        id: '1',
        label: 'Standard',
        accessibilityLabel: 'Standard',
        value: '1',
        borderColor: '#6C6767',
        color: '#277A8C',
        containerStyle: styles.radioButtonContainer,
        size: 30,
        labelStyle: { fontWeight: '600' }
    },
    {
        id: '2',
        label: 'Simple',
        accessibilityLabel: 'Simple',
        value: '2',
        borderColor: '#6C6767',
        color: '#277A8C',
        containerStyle: styles.radioButtonContainer,
        size: 30,
        labelStyle: { fontWeight: '600' }
    },
    {
        id: '3',
        label: 'Super Simple',
        accessibilityLabel: 'Super Simple',
        value: '3',
        borderColor: '#6C6767',
        color: '#277A8C',
        containerStyle: styles.radioButtonContainer,
        size: 30,
        labelStyle: { fontWeight: '600' }
    }
  ]), []);

  const [selectedLang, setSelectedLang] = useState<string | undefined>();
  const [selectedSimp, setSelectedSimp] = useState<string | undefined>();

  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: "center",
        backgroundColor: '#0D1321'
      }}
    >

        <Image
            source={require('../assets/images/sayitsimply-welcome-ribbon.png')}
            style={{
                width: '100%',
                height: 100,
                marginBottom: 48,
                resizeMode: 'contain'
            }}
        />

        <Text
            style={{
                fontSize: 18,
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: 12,
                color: '#ffffff'
            }}
        >
            Language
        </Text>

        <RadioGroup
            radioButtons={languageButtons}
            onPress={setSelectedLang}
            selectedId={selectedLang}
        />

        <View style={{height: 32}} />

        <Text
            style={{
                fontSize: 18,
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: 12,
                color: '#ffffff'
            }}
        >
            Simplification Level
        </Text>

        <RadioGroup
            radioButtons={simpButtons}
            onPress={setSelectedSimp}
            selectedId={selectedSimp}
        />

    </View>
  );
}