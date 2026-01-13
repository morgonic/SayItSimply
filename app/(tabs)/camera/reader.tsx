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
import storage from '@/app/storage';

type ReaderTab = "Overview" | "Easy Read" | "Translate";

type GeminiResponse = {
  summary: string;
  simplified_explanation: string;
  action_items: string[];
  translation?: string | null;
  mode: string;
}

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
  const [geminiData, setGeminiData] = useState<GeminiResponse | null>(null);

  useEffect(() => {
    // prevent mounting issues
    let cancelled = false;

    // call backend ocr endpoint using captured image
    async function runOcrGeminiPipeline() {
      // no image uri, do nothing
      if (!imageUri) {
        return;
      }
      if (!api_url) {
        if (!cancelled) {
          setGeminiError("Missing EXPO_PUBLIC_API_URL");
          setOcrError("Missing EXPO_PUBLIC_API_URL");
        }
        return;
      }

      try {
        // reset UI states
        setOcrLoading(true);
        setOcrError(null);
        setOcrText("");

        setGeminiLoading(false);
        setGeminiError(null);
        setGeminiData(null);
        
        // OCR

        // convert image file to base64 string payload
        const base64 = await uriToBase64(imageUri);
        // call backend ocr endpoint
        const response = await fetch(`${api_url}/ocr`, {
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
          setOcrText(data.text ?? "");
          setOcrLoading(false);
        }

        const token = await storage.getItem("access_token");
        const tokenType = (await storage.getItem("token_type")) ?? "bearer";

        // Gemini

        setGeminiLoading(true);
        // call gemini endpoint, pass in text and mode
        const geminiResponse = await fetch(`${api_url}/gemini`, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `${tokenType} ${token}`} : {})
          },
          body: JSON.stringify({text: data.text ?? "", mode: badgeMode ?? "Document"})
        });
        // check response, handle error
        if (!geminiResponse.ok) {
          const text = await geminiResponse.text();
          throw new Error(text || `Gemini response failed (HTTP ${geminiResponse.status})`);
        }
        // grab and set json data
        const geminiJson: GeminiResponse = await geminiResponse.json();
        if (!cancelled) {
          setGeminiData(geminiJson)
        }
      }
      catch (e: any) {
        // store error message if still mounted
        if (!cancelled) {
          setOcrError(e?.message ?? "OCR failed")
          setGeminiError(e?.message ?? "Request failed");
        }
      }
      finally {
        // stop showing loading state if still mounted
        if (!cancelled) {
          setOcrLoading(false);
          setGeminiLoading(false);
        }
      }
    }

    // run ocr and prompt gemini using extracted text
    runOcrGeminiPipeline();

    return () => {
      cancelled = true;
    };

  }, [imageUri, mode]);

  // update bookmark/badge doc mode label
  const badgeMode = useMemo(() => {
    // if doc mode is not auto-detect, return manually set mode
    if (mode && mode !== "Auto-detect") {
      return mode;
    }
    // if loading states, show 'detecting...'
    if (ocrLoading || geminiLoading) {
      return "Detecting...";
    }
    // return the mode or auto-detect
    return geminiData?.mode ?? "Auto-detect";
  }, [mode, ocrLoading, geminiLoading, geminiData]); // when mode, loading states, or data changes

  // compute text to show inside reader card
  const content = useMemo(() => {
    // while loading, show nothing
    if (ocrLoading) return "";
    if (geminiLoading) return "";
    
    // if failure, show error message in content area
    if (ocrError) return `OCR error:\n\n${ocrError}`;
    if (geminiError) return `Gemini error:\n\n${geminiError}`;

    if (!geminiData) {
      return ocrText ? ocrText : "No Gemini response yet.";
    }
    
    const items = Array.isArray(geminiData.action_items) ? geminiData.action_items : [];

    // otherwise show content based on selected tab
    switch (tab) {
      case "Overview":
        // for now, format action items with summary as numbered list, n/a if no items
        return (
          `${geminiData.summary}\n\n` +
          `Action items:\n\n${items.map((x, i) => `${i+1}) ${x}`).join("\n\n") || "N/A"}`
        );
      case "Easy Read":
        // simplified explanation for easy read tab
        return geminiData.simplified_explanation;
      case "Translate":
        // translation for translate tab, tell user when no translation was provided
        return geminiData.translation ?? "No translation available. Please change your language settings.";
      default:
        return "";
    }
  }, [tab, ocrLoading, ocrError, ocrText, geminiLoading, geminiError, geminiData]); //recompute when tab, data, or loading/error states changes

  // screen dimensions
  const screen = Dimensions.get("window");
  // reader card height
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
              <Text style={styles.badgeText}>{badgeMode}{"\n"}1/1</Text>
              <View style={styles.badgeNotch}/>
            </View>

            {/* Inner "paper" */}
            <View style={styles.innerPaper}>
              {/* little menu icon */}
              <Pressable style={styles.paperMenuBtn} onPress={() => { }}>
                <Text style={styles.paperMenuIcon}>≡</Text>
              </Pressable>

              {/* Loading state + activity indicator */}
              {(ocrLoading || geminiLoading) && (
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
                    {ocrLoading ? "Reading your text..."
                    : "Rewriting your text..."}
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
const PAPER = "#FFFFF2";
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
    top: -20,
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: BADGE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    elevation: 3,
  },
  badgeText: {
    color: "white",
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 14,
  },
  badgeNotch: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -40 }],
    width: 0,
    height: 0,
    borderLeftWidth: 40,
    borderRightWidth: 40,
    borderBottomWidth: 36,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFF2',
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