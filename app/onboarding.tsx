import { View, Image, Text, Dimensions, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import RadioGroup, { RadioButtonProps } from 'react-native-radio-buttons-group';
import { styles } from '@/constants/styles';
import * as Progress from 'react-native-progress';
import storage from "./storage";
import SimplificationLevelModal from "@/components/SimplificationLevelModal";
import SimplificationLevelModalSpanish from "@/components/SimplificationLevelModalSpanish";

const api_url = process.env.EXPO_PUBLIC_API_URL;


export default function OnboardingScreen() {
    // router for navigation
    const router = useRouter();

    // screen dimensions
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    // onboarding progress state
    const [progress, setProgress] = useState(1);
    // simplification level modal visibility state
    const [modalVisible, setModalVisible] = useState(false);

    // factory for making level buttons based on simplification level
    function levelButtonFactory(simpLevel?: '1' | '2' | '3'): RadioButtonProps[] {
        // default to simple (id='2')
        const level = simpLevel ?? '2';
        // text options based on simplification level
        const options =
            // standard
            level === '1' ? [
                { readingLevel: 9, label: "Capture text by photographing it or uploading a document. The application automatically rewrites the text using simpler language while preserving the original meaning." },
                { readingLevel: 8, label: "Capture text by taking a photo or uploading a document. The application rewrites the content in simpler language while maintaining the original meaning." },
                { readingLevel: 7, label: "Scan text by taking a photo or uploading a document. The app rewrites the content using simpler words while keeping the original meaning." }
            ]
                // simple
                : level === '2' ? [
                    { readingLevel: 6, label: "Scan text by taking a photo or uploading a document. The app rewrites it using simpler words while keeping the same meaning." },
                    { readingLevel: 5, label: "Take a photo of text or upload a document. The app will rewrite it using easier words but keep the same meaning." },
                    { readingLevel: 4, label: "Take a photo of text or upload a file. The app changes it to easier words. It keeps the same meaning." }
                ]
                    // super simple
                    : [
                        { readingLevel: 3, label: "Take a photo of words or add a file. The app changes the words to easier ones. It means the same thing." },
                        { readingLevel: 2, label: "Take a photo of words. The app makes the words easier. It means the same thing." },
                        { readingLevel: 1, label: "Take a photo of words. The app makes them easy to read." }
                    ];
        // return options as radio button props
        return options.map((option, index) => ({
            id: String(index + 1),
            value: String(option.readingLevel),
            label: option.label,
            borderColor: '#6C6767',
            color: '#277A8C',
            containerStyle: styles.radioButtonContainer,
            size: 30,
            labelStyle: { fontWeight: '600', padding: 24 }
        }));
    }
    // native language buttons
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
    // simplification level buttons
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
    // selected options states
    const [selectedLang, setSelectedLang] = useState<string | undefined>();
    const [selectedSimp, setSelectedSimp] = useState<string | undefined>();
    const [selectedLevel, setSelectedLevel] = useState<string | undefined>();
    // get simplification level from selected simp button
    const simpLevel = getSelectedValue(simpButtons, selectedSimp) as '1' | '2' | '3' | undefined;

    // regenerate levelButtons when simpLevel changes
    const levelButtons: RadioButtonProps[] = useMemo(() => {
        return levelButtonFactory(simpLevel);
    }, [simpLevel]);

    // reset selectedLevel when simpLevel changes
    useEffect(() => {
        setSelectedLevel(undefined);
    }, [simpLevel]);

    // get access token from storage
    async function getAccessToken() {
        return await storage.getItem("access_token");
    }

    // function to get selected value from radio buttons
    function getSelectedValue(radioButtons: RadioButtonProps[], selectedId?: string) {
        return radioButtons.find(button => button.id === selectedId)?.value;
    }

    // function to complete onboarding, called on final step
    async function completeOnboarding() {
        // show alert if any option is unselected
        if (!selectedLang || !selectedSimp || !selectedLevel) {
            Alert.alert("Close but no cigar!", "Please make a selection for all options.");
            return;
        }

        const language = getSelectedValue(languageButtons, selectedLang) ?? "en";
        const reading_level = Number(getSelectedValue(levelButtons, selectedLevel) ?? 6);
        // onboarding object for storage
        const onboarding = {
            language,
            reading_level
        };
        // access token
        const token = await getAccessToken();
        // check if token exists
        if (!token) {
            // no token, store locally and go to main app
            await storage.setItem("onboarding", JSON.stringify(onboarding));
            router.replace("/(tabs)");
            return;
        }
        // send onboarding to backend
        try {
            // patch to update user info
            const response = await fetch(`${api_url}/users/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(onboarding)
            });
            // check response
            if (!response.ok) {
                const text = await response.text();
                console.error("Onboarding failed:", response.status, text);
                Alert.alert("Error", "Could not save preferences. Please try again.");
                return;
            }
            // go to main app
            router.replace("/(tabs)");
        }
        catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to save preferences.");
        }

    }
    // onboarding step 1
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
                        marginTop: 30,
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

                {/*spacer*/}
                <View style={{ height: 32 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
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

                    {/*spacer*/}
                    <View style={{ width: 12 }} />

                    <Pressable
                        onPress={() => setModalVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel="What are simplification levels?"
                        style={({pressed}) => [{
                            height: 30,
                            width: 30,
                            marginBottom: 12,
                            backgroundColor: "#D9D9D9",
                            borderRadius: 15,
                            borderWidth: 1,
                            borderColor: "#6C6767",
                            alignItems: 'center',
                            justifyContent: 'center'
                        }, pressed && { transform: [{scale: 0.9}]}]}
                    >
                        <Text style={{color: "black", fontWeight: '800', fontSize: 24}}>?</Text>
                    </Pressable>
                </View>


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
                        style={({pressed}) => [
                            styles.onboardPrevButton, 
                            { backgroundColor: progress === 1 ? '#6C6767' : '#809BCE' },
                            pressed && { transform: [{scale: 0.9}]}
                        ]}
                        disabled={progress === 1}
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
                        style={({pressed}) => [
                            styles.onboardNextButton,
                            pressed && {transform: [{scale: 0.9}]}
                        ]}
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

                    {getSelectedValue(languageButtons, selectedLang) === "es" ? (
                        <SimplificationLevelModalSpanish visible={modalVisible} onClose={() => setModalVisible(false)}/>
                    ) : (
                        <SimplificationLevelModal visible={modalVisible} onClose={() => setModalVisible(false)}/>
                    )}

                </View>

            </View>
        );
    }
    // onboarding step 2
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
                        marginTop: 30,
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

                <View style={{ height: 12 }} />

                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-evenly'
                    }}
                >
                    <Pressable
                        onPress={() => setProgress(1)}
                        style={({pressed}) => [
                            styles.onboardPrevButton, 
                            { backgroundColor: '#809BCE' },
                            pressed && {transform: [{scale: 0.9}]
                        }]}
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
                        onPress={completeOnboarding}
                        style={({pressed}) => [
                            styles.onboardNextButton,
                            pressed && {transform: [{scale: 0.9}]}
                        ]}
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