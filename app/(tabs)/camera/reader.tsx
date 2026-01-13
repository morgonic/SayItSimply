import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

type ReaderTab = "Overview" | "Easy Read" | "Translate";

const api_url = process.env.EXPO_PUBLIC_API_URL;

// convert image file uri to base64
async function uriToBase64(uri: string): Promise<string> {
  // fetch local image file uri
  const response = await fetch(uri);
  // if fail to read file, throw error
  if (!response.ok) {
    throw new Error("Failed to read image file.");
  }
  // convert response into blob for filereader to process
  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    // create filereader instance to convert blob into base64 url
    const reader = new FileReader();
    // if filereader fails, reject promise with error
    reader.onerror = () => reject(reader.error);
    // runs when read completes
    reader.onloadend = () => {
      // data url string for image
      const result = reader.result as string;
      // strip off prefixes and keep base64
      const base64 = result.split(",")[1] ?? "";
      // reject if something goes wrong
      if (!base64) {
        reject(new Error("Failed to convert image to base64."));
      }
      // otherwise return base64 string to caller
      else {
        resolve(base64);
      }
    };
    // read blob, create base64 data url in reader.result
    reader.readAsDataURL(blob);
  })
}


export default function ReaderScreen() {
  const [tab, setTab] = useState<ReaderTab>("Overview");

  // read route params passed in from camerascreen
  // imageuri - local image file uri; mode - selected scan mode
  const { imageUri, mode } = useLocalSearchParams<{
    imageUri?: string;
    mode?: string;
  }>();

  // ocr request states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");

  // gemini request states
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [geminiText, setGeminiText] = useState<string>("");

  useEffect(() => {
    // prevent mounting issues
    let cancelled = false;

    // call backend ocr endpoint using captured image
    async function runOcr() {
      // no image uri, do nothing
      if (!imageUri) {
        return;
      }

      try {
        setGeminiLoading(true);
        setGeminiError(null);
        setGeminiText("");
        // // reset UI states
        // setOcrLoading(true);
        // setOcrError(null);
        // setOcrText("");

        // no api url, error
        if (!api_url) {
          throw new Error("Missing EXPO_PUBLIC_API_URL");
        }
        // convert image file to base64 string payload
        const base64 = await uriToBase64(imageUri);
        // call backend ocr endpoint
        const response = await fetch(`${api_url}/gemini`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // send base64 image data + selected mode
          body: JSON.stringify({
            image_base64: base64,
            mode: mode ?? "Document" // default document if none provided
          })
        });

        // bad response, throw readable error
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `OCR failed (HTTP ${response.status})`);
        }

        // parse json response
        const data = await response.json();
        // store ocr text if still mounted
        if (!cancelled) {
          setGeminiText(data.text ?? "");
        }
      }
      catch (e: any) {
        // store error message if still mounted
        if (!cancelled) {
          setGeminiError(e?.message ?? "OCR failed");
        }
      }
      finally {
        // stop showing loading state if still mounted
        if (!cancelled) {
          setGeminiLoading(false);
        }
      }
    }
    // run ocr pipeline
    runOcr();

    return () => {
      // mark cancelled after unmount
      cancelled = true;
    };
  }, [imageUri, mode]); // run ocr pipeline when imageUri/mode changes

  // compute text to show inside reader card
  const content = useMemo(() => {
    // while loading, show nothing
    if (geminiLoading) return "";
    // if failure, show error message in content area
    if (geminiError) return `OCR error:\n${ocrError}`;

    // otherwise show content based on selected tab
    switch (tab) {
      case "Overview":
        return geminiText || "No Gemini text available. Try the request again.";
        // // show raw ocr text as overview
        // return ocrText || "No OCR text yet.";
      case "Easy Read":
        // placeholder until gemini pipeline implemented
        return (
          "Easy Read will appear here.\n\n" +
          "Later: send OCR text to Gemini and show simplified text."
        );
      case "Translate":
        // placeholder until translation implemented
        return (
          "Translation will appear here.\n\n" +
          "Later: select a language and show translated text."
        );
      default:
        return "";
    }
  }, [tab, geminiLoading, geminiError, geminiText]); //recompute when tab or ocr state changes

  const screen = Dimensions.get("window");
  const cardHeight = Math.min(screen.height * 0.62, 560);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerIconBtn} onPress={() => { }}>
            <Text style={styles.headerIcon}>☰</Text>
          </Pressable>

          <Text style={styles.headerTitle}>SayItSimply</Text>

          <Pressable style={styles.avatarBtn} onPress={() => { }}>
            <View style={styles.avatarPlaceholder} />
          </Pressable>
        </View>

        <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator
            indicatorStyle='white'
        >

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
              <Pressable style={styles.paperMenuBtn} onPress={() => { }}>
                <Text style={styles.paperMenuIcon}>≡</Text>
              </Pressable>

              {/* Loading state + activity indicator */}
              {geminiLoading && (//ocrLoading && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  marginBottom: 10,
                  marginTop: 48
                }}
                >
                  <ActivityIndicator
                    size={28}
                    color={'black'}
                  />
                  <Text style={{
                    fontWeight: '600',
                    fontSize: 24,
                    textAlign: 'center',
                    justifyContent: 'center'
                  }}
                  >
                    Fetching Gemini response...
                    {/*Extracting text from image...*/}
                  </Text>
                </View>
              )}

              {/* Body text */}
              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={styles.bodyScrollContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps='handled'
                indicatorStyle='black'
              >
                <Text style={styles.bodyText}>{content}</Text>
              </ScrollView>


              {/* Bottom CTA */}
              <Pressable style={styles.ctaBtn} onPress={() => { }}>
                <Text style={styles.ctaText}>Simplify More</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
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
  safe: { 
    flex: 1, 
    backgroundColor: BG
  },
  container: { 
    flex: 1, 
    backgroundColor: BG, 
    paddingHorizontal: 16
  },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: { width: 44, height: 44, justifyContent: "center", marginRight: 8 },
  headerIcon: { color: "white", fontSize: 36, marginTop: 8, marginLeft: 8 },
  headerTitle: { color: ACCENT, fontSize: 26, fontWeight: "700" },
  avatarBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "flex-end" },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  tabRow: {
    marginTop: Dimensions.get('window').height * 0.034,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 6
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
    marginTop: 28,
    borderRadius: 24,
    borderWidth: 12,
    borderColor: TAB_INACTIVE,
    backgroundColor: CARD_BORDER,
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

  bodyScroll: {
    flex: 1
  },
  bodyScrollContent: {
    padding: 24
  },
  bodyText: {
    color: "#1B1B1B",
    fontSize: 16.67,
    lineHeight: 24,
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