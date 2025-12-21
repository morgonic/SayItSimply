import { styles } from "@/constants/styles";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LogInScreen() {
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
            <Pressable style={styles.dashScanBtn} onPress={() => {}}>
              <Text style={styles.dashScanIcon}>From pic</Text>
            </Pressable>

            <Pressable style={styles.dashScanBtn} onPress={() => {}}>
              <Text style={styles.dashScanIcon}>upload from files</Text>
            </Pressable>
          </View>

          {/* Continue Reading */}
          <View style={styles.dashContinueCardWrap}>
            <View style={styles.dashBookmark} />
            <View style={styles.dashContinueCard}>
              <Text style={styles.dashContinueTitle}>Phone Bill - Dec 2025</Text>

              <Pressable style={styles.dashContinueBtn} onPress={() => router.push("/reader")}>
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

                <Pressable style={styles.dashViewAllBtn} onPress={() => router.push("/(tabs)/todo-list")}>
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
            onPress={() => router.push("/log-in")}
            style={styles.dashLoginBtn}
          >
            <Text style={styles.dashLoginText}>Go to Log In</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}