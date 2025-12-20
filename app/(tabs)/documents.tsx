import { styles } from "@/constants/styles";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function documentsScreen() {
  return (
    <SafeAreaView style={styles.dashSafe}>
      <View style={styles.dashContainer} />
    </SafeAreaView>
  );
}