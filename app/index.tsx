import storage from "@/app/storage";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

const api_url = process.env.EXPO_PUBLIC_API_URL;

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        (async () => {
            const token = await storage.getItem("access_token");

            if (!token) {
                router.replace('/log-in');
                return;
            }

            const reponse = await fetch(`${api_url}/users/me`, {
                headers: { Authorization: `Bearer ${token}`}
            });

            if (!reponse.ok) {
                await storage.deleteItem("access_token");
                router.replace('/log-in');
                return;
            }

            const user = await reponse.json();
            const onboarded = (user.onboarding_done === true);

            router.replace(onboarded ? '/(tabs)' : '/onboarding')
        })();
    }, []);
    
    return(
        <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator />
        </View>
    )
}