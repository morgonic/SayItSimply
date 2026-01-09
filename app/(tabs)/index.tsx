import { styles } from "@/constants/styles";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import storage from '../storage';

const api_url = process.env.EXPO_PUBLIC_API_URL;

export default function DashboardScreen() {

  const router = useRouter();

  async function handleLogout() {
    const token = await storage.getItem("access_token");
    const tokenType = (await storage.getItem("token_type")) ?? "bearer";

    if (token && api_url) {
      try {
        const response = await fetch(`${api_url}/auth/jwt/logout`, {
          method: 'POST',
          headers: { Authorization: `${tokenType} ${token}`}
        });
      }
      catch (e) {
        console.warn("Logout request failed:", e);
      }
    }

    await storage.deleteItem("access_token");
    await storage.deleteItem("token_type");

    await storage.deleteItem("onboarding");

    router.replace('/log-in');
    
  }

  return (
     <SafeAreaView style={styles.dashSafe}>
      <View style={styles.dashContainer}>
        {/* Header */}
        <View style={styles.dashHeader}>
          <Pressable style={styles.dashHeaderIconBtn} onPress={() => {}}>
            <Text style={styles.dashHeaderIcon}>☰</Text>
          </Pressable>

          <Text style={styles.dashHeaderTitle}>SayItSimply</Text>

          <Pressable style={styles.dashAvatarBtn} onPress={() => {}}>
            <View style={styles.dashAvatarPlaceholder} />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.dashContent}>
          {/* Scan New Text */}
          <Text style={styles.dashSectionTitle}>Scan New Text</Text>

          <View style={styles.dashScanRow}>
            <Pressable style={styles.dashScanBtn} onPress={() => router.replace("/camera")}>
              <FontAwesome name="camera" size={28} color="#000000"/>
            </Pressable>

            <Pressable style={styles.dashScanBtn} onPress={() => {}}>
              <FontAwesome name="upload" size={28} color="#000000"/>
            </Pressable>
          </View>

          {/* Continue Reading */}
          <View style={styles.dashContinueCardWrap}>
            <View style={styles.dashBookmark} />
            <View style={styles.dashContinueCard}>
              <Text style={styles.dashContinueTitle}>Phone Bill - Dec 2025</Text>

              <Pressable style={styles.dashContinueBtn} onPress={() => router.replace("/(tabs)/camera/reader")}>
                <Text style={styles.dashContinueBtnText}>Continue Reading</Text>
                <Text style={styles.dashContinueBtnArrow}>›</Text>
              </Pressable>
            </View>
          </View>

          {/* Shortcuts */}
          <Text style={[styles.dashSectionTitle, styles.dashShortcutsTitleSpacing]}>
            Shortcuts
          </Text>

          <View style={styles.dashShortcutRow}>
            {/* Urgent Tasks */}
            <View style={styles.dashShortcutCardOuter}>
              <View style={styles.dashShortcutCard}>
                <Text style={styles.dashShortcutTitle}>Urgent Tasks</Text>

                <View style={styles.dashBulletGroup}>
                  <Text style={styles.dashBullet}>• Pay $52.50 to AT&amp;T</Text>
                  <Text style={styles.dashBullet}>• Call Dr. Smith</Text>
                </View>

                <Pressable style={styles.dashViewAllBtn} onPress={() => router.replace("/(tabs)/todo-list")}>
                  <Text style={styles.dashViewAllText}>View All</Text>
                  <Text style={styles.dashViewAllArrow}>›</Text>
                </Pressable>
              </View>
            </View>

            {/* Recent Scans */}
            <View style={styles.dashShortcutCardOuter}>
              <View style={styles.dashShortcutCard}>
                <Text style={styles.dashShortcutTitle}>Recent Scans</Text>

                <View style={styles.dashBulletGroup}>
                  <Text style={styles.dashBullet}>• Medical Bill - Yesterday</Text>
                  <Text style={styles.dashBullet}>
                    • Financial Aid Letter - 3 days ago
                  </Text>
                </View>

                <Pressable style={styles.dashViewAllBtn} onPress={() => router.push("/(tabs)/documents")}>
                  <Text style={styles.dashViewAllText}>View All</Text>
                  <Text style={styles.dashViewAllArrow}>›</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* login button (maybe temporary?) */}
        <View style={styles.dashLoginWrap}>
          <Pressable
            onPress={handleLogout}
            style={styles.dashLoginBtn}
          >
            <Text style={styles.dashLoginText}>Log Out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}