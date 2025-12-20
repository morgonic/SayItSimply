import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const web = Platform.OS === 'web';

const storage = {
    async getItem(key: string) {

        if (web){
            return Promise.resolve(localStorage.getItem(key));
        }
        
        const ok = await SecureStore.isAvailableAsync().catch(() => false);

        if (!ok) {
            return null;
        }

        return SecureStore.getItemAsync(key);
    },
    async setItem(key: string, value: string) {

        if (web) {
            localStorage.setItem(key, value);
            return;
        }

        const ok = await SecureStore.isAvailableAsync().catch(() => false);
        
        if (!ok) {
            return;
        }

        return SecureStore.setItemAsync(key, value);
    },
    async deleteItem(key: string) {

        if (web) {
            localStorage.removeItem(key);
            return;
        }

        const ok = await SecureStore.isAvailableAsync().catch(() => false);

        if (!ok) {
            return;
        }

        return SecureStore.deleteItemAsync(key);
    }
}

export default storage;