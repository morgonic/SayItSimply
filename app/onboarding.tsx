import { View, Image, Text, Dimensions, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useMemo, useState, version } from "react";
import RadioGroup, { RadioButtonProps } from 'react-native-radio-buttons-group';
import { styles } from '@/constants/styles';
import * as Progress from 'react-native-progress';

export default function OnboardingScreen() {
  
  const router = useRouter();

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const [progress, setProgress] = useState(1);

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

  const levelButtons: RadioButtonProps[] = useMemo(() => ([
    {
        id: '1',
        label: 'Scan text by taking a photo or uploading a document. The app rewrites it in clearer words while keeping the same meaning.',
        value: '1',
        borderColor: '#6C6767',
        color: '#277A8C',
        containerStyle: styles.radioButtonContainer,
        size: 30,
        labelStyle: { fontWeight: '600', padding: 24 }
    },
    {
        id: '2',
        label: 'Take a photo or upload a document. The app rewrites the text using easier words and keeps the meaning.',
        accessibilityLabel: 'Simple',
        value: '2',
        borderColor: '#6C6767',
        color: '#277A8C',
        containerStyle: styles.radioButtonContainer,
        size: 30,
        labelStyle: { fontWeight: '600', padding: 24 }
    },
    {
        id: '3',
        label: 'Take a picture or upload a file. The app makes the text easier to read and keeps the same meaning.',
        accessibilityLabel: 'Super Simple',
        value: '3',
        borderColor: '#6C6767',
        color: '#277A8C',
        containerStyle: styles.radioButtonContainer,
        size: 30,
        labelStyle: { fontWeight: '600', padding: 24 }
    }
  ]), []);

  const [selectedLang, setSelectedLang] = useState<string | undefined>();
  const [selectedSimp, setSelectedSimp] = useState<string | undefined>();
  const [selectedLevel, setSelectedLevel] = useState<string | undefined>();

  if (progress === 1) {
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
                    marginBottom: 30,
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
                Step 1 of 2
            </Text>

            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginBottom: 24
                }}
            >
                <Progress.Bar 
                    progress={0.5} 
                    width={screenWidth * 0.7} 
                    height={18}
                    borderRadius={10}
                    color={'#8C311C'}
                    unfilledColor={'#D9D9D9'}
                    borderWidth={0}
                />
            </View>
            

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

            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-evenly',
                    marginBottom: 24
                }}
            >
                <Pressable
                    onPress={() => setProgress(1)}
                    style={[styles.onboardPrevButton, {backgroundColor: progress === 1 ? '#6C6767' : '#809BCE'}]}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: 'white',
                        }}
                    >
                        Prev
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => setProgress(2)}
                    style={styles.onboardNextButton}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: 'white',
                        }}
                    >
                        Next
                    </Text>
                </Pressable>
            </View>

        </View>
    );
  }
  else if (progress === 2) {
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
                    marginBottom: 30,
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
                Step 2 of 2
            </Text>

            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginBottom: 24
                }}
            >
                <Progress.Bar 
                    progress={1} 
                    width={screenWidth * 0.7} 
                    height={18}
                    borderRadius={10}
                    color={'#8C311C'}
                    unfilledColor={'#D9D9D9'}
                    borderWidth={0}
                />
            </View>
            

            <Text
                style={{
                    fontSize: 18,
                    fontWeight: '600',
                    textAlign: 'center',
                    marginBottom: 12,
                    color: '#ffffff'
                }}
            >
                Choose Your Preferred Version
            </Text>

            <RadioGroup
                radioButtons={levelButtons}
                onPress={setSelectedLevel}
                selectedId={selectedLevel}
            />

            <View style={{height: 12}} />

            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-evenly'
                }}
            >
                <Pressable
                    onPress={() => setProgress(1)}
                    style={[styles.onboardPrevButton, {backgroundColor: '#809BCE'}]}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: 'white',
                        }}
                    >
                        Prev
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => router.replace("/(tabs)")}
                    style={styles.onboardNextButton}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: 'white',
                        }}
                    >
                        Next
                    </Text>
                </Pressable>
            </View>

        </View>
    );
  }
}