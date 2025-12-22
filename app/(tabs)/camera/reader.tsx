import React, { useMemo, useState } from "react";
import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ReaderTab = "Overview" | "Easy Read" | "Translate";

export default function ReaderScreen() {
  const [tab, setTab] = useState<ReaderTab>("Overview");

  // Placeholder content per tab (swap later)
  const content = useMemo(() => {
    switch (tab) {
      case "Overview":
        return (
          "You owe $52.50 to AT&T for your monthly phone service.\n\n" +
          "The company wants you to pay by December 20. If you do not pay by that date, they might turn off your service.\n\n" +
          "You can pay online, by phone, or in person.\nIf you have a question, you can call customer service at 555-555-1234."
        );
      case "Easy Read":
        return (
          "You need to pay $52.50.\n\n" +
          "Pay by Dec 20.\n\n" +
          "If you don’t pay, your phone service could stop.\n\n" +
          "Pay online, by phone, or in person.\nCall 555-555-1234 for help."
        );
      case "Translate":
        return (
          "Translation will appear here.\n\n" +
          "Later: select a language and show translated text."
        );
      default:
        return "";
    }
  }, [tab]);

  const screen = Dimensions.get("window");
  const cardHeight = Math.min(screen.height * 0.62, 560);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerIconBtn} onPress={() => {}}>
            <Text style={styles.headerIcon}>☰</Text>
          </Pressable>

          <Text style={styles.headerTitle}>SayItSimply</Text>

          <Pressable style={styles.avatarBtn} onPress={() => {}}>
            <View style={styles.avatarPlaceholder} />
          </Pressable>
        </View>

        {/* Top Tabs */}
        <View style={styles.tabRow}>
          <TopTab label="Overview" active={tab === "Overview"} onPress={() => setTab("Overview")} />
          <TopTab label="Easy Read" active={tab === "Easy Read"} onPress={() => setTab("Easy Read")} />
          <TopTab label="Translate" active={tab === "Translate"} onPress={() => setTab("Translate")} />
        </View>

        {/* Card Area */}
        <View style={[styles.outerCard, { height: cardHeight }]}>
          {/* Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Bill{"\n"}1/1</Text>
          </View>

          {/* Inner "paper" */}
          <View style={styles.innerPaper}>
            {/* little menu icon */}
            <Pressable style={styles.paperMenuBtn} onPress={() => {}}>
              <Text style={styles.paperMenuIcon}>≡</Text>
            </Pressable>

            {/* Body text */}
            <Text style={styles.bodyText}>{content}</Text>

            {/* Bottom CTA */}
            <Pressable style={styles.ctaBtn} onPress={() => {}}>
              <Text style={styles.ctaText}>Simplify More</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function TopTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.topTab, active ? styles.topTabActive : styles.topTabInactive]}
      hitSlop={8}
    >
      <Text style={[styles.topTabText, active ? styles.topTabTextActive : styles.topTabTextInactive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const BG = "#0B1020";
const ACCENT = "#E9C6A6";
const TAB_ACTIVE = "#C97E6F";
const TAB_INACTIVE = "#E9C6A6";
const CARD_BORDER = "#2C9AA4";
const PAPER = "#F2F2F2";
const BADGE = "#B65A43";
const CTA = "#2C9AA4";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 16 },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: { width: 44, height: 44, justifyContent: "center" },
  headerIcon: { color: "white", fontSize: 22 },
  headerTitle: { color: ACCENT, fontSize: 26, fontWeight: "700" },
  avatarBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "flex-end" },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  tabRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 6,
  },
  topTab: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  topTabActive: { backgroundColor: TAB_ACTIVE },
  topTabInactive: { backgroundColor: TAB_INACTIVE },
  topTabText: { fontSize: 14, fontWeight: "800" },
  topTabTextActive: { color: "#1B1B1B" },
  topTabTextInactive: { color: "#1B1B1B" },

  outerCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: CARD_BORDER,
    padding: 12,
    position: "relative",
  },

  badge: {
    position: "absolute",
    right: 14,
    top: -10,
    width: 52,
    height: 60,
    borderRadius: 10,
    backgroundColor: BADGE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  badgeText: {
    color: "white",
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 14,
  },

  innerPaper: {
    flex: 1,
    backgroundColor: PAPER,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },

  paperMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  paperMenuIcon: { color: "#222", fontSize: 20, fontWeight: "900" },

  bodyText: {
    color: "#1B1B1B",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    flex: 1,
  },

  ctaBtn: {
    marginTop: 14,
    alignSelf: "center",
    width: "88%",
    height: 46,
    borderRadius: 12,
    backgroundColor: CTA,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaText: { color: "white", fontWeight: "900", fontSize: 16 },
});