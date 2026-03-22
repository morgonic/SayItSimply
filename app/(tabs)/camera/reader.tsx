import { useTheme } from '@/app/context/ThemeContext';
import storage from '@/app/storage';
import ActionItemModal from '@/components/ActionItemModal';
import HelpModal from '@/components/HelpModal';
import AppText from "@/components/TextSize";
import { readerDarkStyles, readerPalette, readerStyles } from '@/constants/styles';
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams } from "expo-router";
import ISO6391 from "iso-639-1";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; //32KB
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  const btoaFn =
    (globalThis as any).btoa ||
    ((str: string) => {
      throw new Error("btoa is not available.");
    });

  return btoaFn(binary);
}

function sliderToRateMultiplier(v: number): number {
  const rate = Math.pow(2, v / 2);
  return Math.max(0.5, Math.min(2.0, rate));
}

// reader screen tabs
type ReaderTab = "Overview" | "Easy Read" | "Translate";

// custom action item type to match gemini output
type ActionItem = {
  id?: string;
  action_item: string;
  deadline: string | null; // null if no deadline
  completed: boolean;
}

// structured gemini output
type GeminiResponse = {
  summary: string;
  simplification: string;
  action_items: ActionItem[];
  translation?: string | null;
  mode: string;
  reading_level?: number;
  complex_words?: string[]; // OCR text
  complex_definitions?: string[]; // OCR text
  simple_words?: string[]; // Simplified text
  simple_definitions?: string[]; // Simplified text
}

// complex word/definitions modal states: visibility, word, definition
type DefinitionModalState = {
  isVisible: boolean;
  word: string;
  definition: string;
}

type LanguageRow = {
  code2: string;
  name: string;
}

type DocPage = {
  page_num: number;
  ocr_text?: string | null;
  language?: string | null;
};

type DocDetail = {
  id: string;
  mode: string;
  timestamp: string;
  file_uri: string;
  thumb_uri: string;
  preview_text?: string | null;
  page_count?: number;
  combined_ocr_text?: string | null;
  pages?: DocPage[];
}

const calibScanCountKey = "calib_scan_count";
const calibFreqKey = "calib_freq";
const calibReadingLevelKey = "user_reading_level";

// backend fastapi url
const api_url = process.env.EXPO_PUBLIC_API_URL;

// takes in language code, returns full language name
function langCodeToName(code: string): string {
  const c = (code ?? "").trim().toLowerCase();
  if (!c) return "Unknown";
  const lang = ISO6391.getName(c);
  return lang || code;
}

// convert image file uri to base64
async function uriToBase64(uri: string): Promise<string> {
  const token = await storage.getItem("access_token");
  const tokenType = (await storage.getItem("token_type")) ?? "bearer";

  const isRemote = 
  typeof uri === "string" && !!api_url && uri.startsWith(api_url.replace(/\/$/, ""));
  // fetch local image file uri
  const response = await fetch(uri, {
    headers: {
      ...(isRemote && token ? { Authorization: `${tokenType} ${token}` } : {}),
    },
  });
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
      if (!base64) reject(new Error("Failed to convert image to base64."));
      // otherwise return base64 string to caller
      else resolve(base64);
    };
    // read blob, create base64 data url in reader.result
    reader.readAsDataURL(blob);
  })
}

// randomizer functions
function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function randomIntInclusive(min: number, max: number) {
  const _min = Math.ceil(min);
  const _max = Math.floor(max);
  return Math.floor(Math.random() * (_max - _min + 1)) + _min;
}

function clampToTwoSentences(text: string): string {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ");
}

async function updatePreview(docId: string, previewText: string) {
  const token = await storage.getItem("access_token");
  const tokenType = (await storage.getItem("token_type")) ?? "bearer";
  if (!token) return;

  try {
    const res =await fetch(`${api_url}/documents/${docId}/preview_text`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${tokenType} ${token}`,
      },
      body: JSON.stringify({ preview_text: (previewText ?? "").trim().slice(0, 250) }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn("Preview PATCH failed:", res.status, txt);
    }
  } catch (e) {
    console.warn("Failed to update preview text:", e);
  }
}

/**
 * 
 * reading level pulled from db. left option is 1 reading lvl lower, right option is 1 reading lvl higher
 * caveat: if reading lvl is 1, left option is reading level 2 and right option is reading level 3
 * caveat: if reading lvl is 9, left option is reading level 7 and right option is reading level 8
 */
function CalibrateReadingLvl(current: number) {
  if (current == 1) return { left: 2, right: 3 };
  if (current == 9) return { left: 7, right: 8 };
  return { left: clampInt(current - 1, 1, 9), right: clampInt(current + 1, 1, 9) };
}
export default function ReaderScreen() {
  const { darkMode } = useTheme();

  const P = darkMode ? readerPalette.dark : readerPalette.light;

  const ctaIcon = darkMode ? "#0B1220" : "white";

  const reading_levels = {
    standard: 9,
    simple: 6,
    super_simple: 3,
  } as const;
  // session reading level state for easy read tab
  const [sessionReadingLevel, setSessionReadingLevel] = useState<number | null>(null);

  // tracking reader tab being viewed
  const [tab, setTab] = useState<ReaderTab>("Overview");
  // tracking Overview text being viewed (original vs summary)
  const [showOriginal, setShowOriginal] = useState(false);

  // read route params passed in from camerascreen
  // imageuri - local image file uri; mode - selected scan mode
  const params = useLocalSearchParams<{
    imageUri?: string;
    mode?: string;
    docId?: string;
  }>();

  const imageUri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const docId = Array.isArray(params.docId) ? params.docId[0] : params.docId;

  const [savedDocLoading, setSavedDocLoading] = useState(false);
  const [savedDocPages, setSavedDocPages] = useState<DocPage[]>([]);
  const [savedDocPageCount, setSavedDocPageCount] = useState<number>(1);
  const [savedDocCombinedText, setSavedDocCombinedText] = useState<string>("");
  const [savedDocMode, setSavedDocMode] = useState<string | null>(null);

  // ocr request states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [ocrLanguage, setOcrLanguage] = useState<string>("unknown");

  const [userLang, setUserLang] = useState<string | null>(null);

  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [langSearch, setLangSearch] = useState("");

  const effectiveOcrText = useMemo(() => {
    return (savedDocCombinedText || ocrText || "").trim();
  }, [savedDocCombinedText, ocrText]);

  //multi-page docs
  const displayPages = useMemo(() => {
    if (savedDocPages.length > 0) {
      return savedDocPages;
    }

    if (savedDocPageCount > 1 && effectiveOcrText) {
      const parts = effectiveOcrText
        .split(/\n\s*\n/)
        .map((x) => x.trim())
        .filter(Boolean);

      if (parts.length > 1) {
        return parts.map((text, index) => ({
          page_num: index + 1,
          ocr_text: text,
          language: null,
        }));
      }
    }

    return [];
  }, [savedDocPages, savedDocPageCount, effectiveOcrText]);

  const hasDisplayPages = displayPages.length > 0;

  //highlight difficult words toggle actionizer
  const [highlightEnabled, setHighlightEnabled] = useState<boolean>(true);

  const loadHighlightSetting = useCallback(async () => {
    try {
      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type")) ?? "bearer";
      if (!api_url || !token) return;

      const res = await fetch(`${api_url}/users/me/settings`, {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      if (!res.ok) return;

      const json = await res.json();

      if (typeof json.highlight_difficult_words === "boolean") {
        setHighlightEnabled(json.highlight_difficult_words);
      } else {
        setHighlightEnabled(true);
      }
    } catch {
      setHighlightEnabled(true);
    }
  }, []);

  // gemini request states
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [geminiData, setGeminiData] = useState<GeminiResponse | null>(null);

  const effectiveMode = useMemo(() => {
    return savedDocMode || mode || geminiData?.mode || "Document";
  }, [savedDocMode, mode, geminiData?.mode]);

  //gemini TTS states
  type TtsStatus = 'idle' | 'generating' | 'playing' | 'stopping';
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>('idle');
  const [ttsRateSlider, setTtsRateSlider] = useState<number>(0.0);
  const [ttsRate, setTtsRate] = useState<number>(1.0);
  const [ttsPitch, setTtsPitch] = useState<number>(0.0);
  const ttsIsGenerating = ttsStatus === 'generating';
  const ttsIsPlaying = ttsStatus === 'playing';
  const ttsIsStopping = ttsStatus === 'stopping';
  const ttsBusy = ttsIsGenerating || ttsIsPlaying || ttsIsStopping;

  const loadTtsSettings = useCallback(async () => {
    try {
      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type")) ?? "bearer";
      if (!api_url || !token) return;

      const res = await fetch(`${api_url}/users/me/settings`, {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      if (!res.ok) return;

      const json = await res.json();

      if (typeof json.tts_rate === "number") {
        setTtsRateSlider(json.tts_rate);
        setTtsRate(sliderToRateMultiplier(json.tts_rate));
      }

      if (typeof json.tts_pitch === "number") {
        setTtsPitch(json.tts_pitch);
      }
    } catch {}
  }, []);

  const soundRef = useRef<Audio.Sound | null>(null);
  const ttsTempFileRef = useRef<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);

  function mapPitchToGemini(p: number): number {
    const v = Number(p);
    if (!Number.isFinite(v)) return 0;
    const out = v <= 1.0 ? (v - 1.0) / 0.5 : (v - 1.0);
    return Math.max(-1, Math.min(1, out));
  }

  async function cleanSound() {
    // separating cleaning logic from stopping logic
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
      }
    } finally {
      soundRef.current = null;
    }
    try {
      if (ttsTempFileRef.current) {
        await FileSystem.deleteAsync(ttsTempFileRef.current, { idempotent: true }).catch(() => {});
      }
    } finally {
      ttsTempFileRef.current = null;
    }
  }

  async function stopAndCleanSound() {
    // set the TTS status to 'stopping'
    setTtsStatus('stopping');
    // abort TTS request
    try{
      if (ttsAbortRef.current) {
        ttsAbortRef.current.abort();
        ttsAbortRef.current = null;
      }
      // then clean up sound/temp files
      await cleanSound();
    }
    finally{
      // then set TTS status to 'idle'
      setTtsStatus('idle');
    }
  }

  // fetch TTS from backend
  useFocusEffect(
    useCallback(() => {
      loadTtsSettings();
    }, [loadTtsSettings])
  );

  //fetch highlight word setting
  useFocusEffect(
    useCallback(() => {
      loadHighlightSetting();
    }, [loadHighlightSetting])
  );

  //clean sound
  useEffect(() => {
    return () => {
      stopAndCleanSound();
    };
  }, []);

  function getSpeechText(): string {
    if (ocrLoading || geminiLoading) return "";

    if (tab === "Overview") {
      if (showOriginal) return effectiveOcrText;
      return (geminiData?.summary ?? "").trim();
    }
    if (tab === "Easy Read") {
      return (simplifyMoreText ?? geminiData?.simplification ?? "").trim();
    }
    if (tab === "Translate") {
      const translated = (geminiData?.translation ?? "").trim();
      if (translated) return translated;

      const userLanguage = (userLang ?? "not set").toUpperCase();
      return `No translation available. Your language and the text are both set to ${langCodeToName(userLanguage)}.`;
    }
    return "";
  }

  function getShareText(): string {
    if (ocrLoading || geminiLoading) return "";

    if (tab === "Overview") {
      if (showOriginal) return "";
      return (geminiData?.summary ?? "").trim();
    }

    if (tab === "Easy Read") {
      return (simplifyMoreText === null
        ? (geminiData?.simplification ?? "")
        : (simplifyMoreText ?? "")
      ).trim();
    }

    return "";
  }

  async function shareSummary() {
    const textToShare = getShareText();

    if (!textToShare) {
      Alert.alert("Nothing to share", "There is no simplified text available to share yet.");
      return;
    }

    try {
      await Share.share({
        message: textToShare,
        title: "SayItSimply Document Summary",
      });
    } catch (e: any) {
      console.warn("Share failed:", e?.message ?? e);
      Alert.alert("Share Error", e?.message ?? "Failed to share the document summary.");
    }
  }

  async function fetchSavedDocDetail(docId: string): Promise<DocDetail | null> {
    try {
      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type")) ?? "bearer";
      if (!token || !api_url) return null;

      const res = await fetch(`${api_url}/documents/${docId}`, {
        headers: {
          Authorization: `${tokenType} ${token}`,
        },
      });

      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn("Unable to pull saved document details:", e);
      return null;
    }
  }

  async function speechCurrentTab() {
    const textToSpeech = getSpeechText();
    if (!textToSpeech) {
      Alert.alert("Nothing to read", "There is not any text available to play yet.");
      return;
    }
    // return if TTS status is already generating or stopping
    if (ttsBusy) return;
    
    const abortController = new AbortController();
    ttsAbortRef.current = abortController;

    try {
      // clean up old sound before generating new one
      await cleanSound();
      setTtsStatus('generating');

      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type")) ?? "bearer";

      const body = {
        text: textToSpeech,
        rate: ttsRateSlider,
        pitch: mapPitchToGemini(ttsPitch),
        voice: "Autonoe",
        model: "gemini-2.5-flash-preview-tts",
      };

      const res = await fetch(`${api_url}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: abortController.signal
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `TTS failed (HTTP ${res.status})`);
      }

      const wavArrayBuffer = await res.arrayBuffer();
      const tmpPath = `${FileSystem.cacheDirectory}sayitsimply_tts_${Date.now()}.wav`;
      const b64 = arrayBufferToBase64(wavArrayBuffer);

      await FileSystem.writeAsStringAsync(tmpPath, b64, { encoding: FileSystem.EncodingType.Base64 });
      ttsTempFileRef.current = tmpPath;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: tmpPath },
        { shouldPlay: false }
      );

      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          return;
        }

        if (status.didJustFinish) {
          void stopAndCleanSound();
        }
      });

      await sound.setRateAsync(ttsRate, true);
      // start playing sound
      await sound.playAsync();
      // set TTS status to playing
      setTtsStatus('playing');
    } catch (e: any) {
      // ignore abort errors bc they are expected when user stops TTS or starts new TTS
      if (e.name === 'AbortError') {
        return;
      }
      // otherwise log and show error
      console.warn("TTS play failed:", e?.message ?? e);
      Alert.alert("TTS Error", e?.message ?? "Failed to generate or play audio.");
      // then clean up sound/temp files
      await stopAndCleanSound();
    } finally {
      // clear abort controller ref
      ttsAbortRef.current = null;
    }
  }

  // fetch user language from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try{
        const token = await storage.getItem("access_token");
        const tokenType = (await storage.getItem("token_type")) ?? "bearer";
        if (!api_url || !token) {
          return;
        }

        const response = await fetch(`${api_url}/users/me`, {
          headers: {Authorization: `${tokenType} ${token}`}
        });

        if (!response.ok) {
          return;
        }

        const user = await response.json();
        const lang = (user.language ?? null) as string | null;

        if (!cancelled) {
          setUserLang(lang);
        }
      }
      catch {
        if (!cancelled) {
          setUserLang(null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const Languages: LanguageRow[] = useMemo(() => {
    const codes = ISO6391.getAllCodes();
    const rows = codes.map((c) => ({
      code2: c.toUpperCase(),
      name: ISO6391.getName(c) || c.toUpperCase(),
    }))
    .filter((r) => r.code2.length === 2 && !!r.name)
    .sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, []);

  const filteredLangs = useMemo(() => {
    const q = langSearch.trim().toLowerCase();
    if (!q) return Languages;
    return Languages.filter((l) =>
      l.name.toLowerCase().includes(q) || l.code2.toLowerCase().includes(q)
    );
  }, [langSearch, Languages]);

  // overall loading state
  const isLoading = savedDocLoading || ocrLoading || geminiLoading;
  // whether speech text exists
  const currentSpeechText = getSpeechText().trim();
  const hasSpeechText = currentSpeechText.length > 0;
  // disabled TTS play button when loading, generating, stopping, or there's no text to play
  const ttsPlayDisabled = isLoading || ttsBusy || !hasSpeechText;
  // disable stop button when idle
  const ttsStopDisabled = !(ttsIsGenerating || ttsIsPlaying || ttsIsStopping);
  // state to disable tabs during loading or TTS busy
  const tabsDisabled = isLoading || ttsBusy;

  console.log("DISABLED CHECK", {
    tab,
    ttsStatus,
    isLoading,
    ttsBusy,
    hasSpeechText,
    ttsPlayDisabled,
    currentSpeechTextLength: currentSpeechText.length
  })

  const badgeLang = useMemo(() => {
    if (tab === "Translate") return (userLang ?? "EN").toUpperCase();
    const o = (ocrLanguage ?? "unknown").toUpperCase();
    return o === "UNKNOWN" ? "N/A" : o;
  }, [tab, userLang, ocrLanguage]);

  // only show language label under these conditions
  const showLangLabel = !isLoading && !ocrError && !!effectiveOcrText && badgeLang !== "N/A";
  // formatted language label (capitalized or N/A)
  const langLabel = badgeLang;

  // simplify more states
  const [simplifyMoreText, setSimplifyMoreText] = useState<string | null>(null);
  const [simplifyMoreCount, setSimplifyMoreCount] = useState<number>(0);
  const [simplifiedReadingLevel, setSimplifiedReadingLevel] = useState<number | null>(null);
  const [simplifiedMost, setSimplifiedMost] = useState<boolean>(false);

  // complex word definition modal state
  const [definitionModal, setDefinitionModal] = useState<DefinitionModalState>({
    isVisible: false, // visibility state, starts hidden
    word: "", // word being defined, starts empty
    definition: "" // definition of word, starts empty
  });

  // action items modal states
  const [actionItemsVisible, setActionItemsVisible] = useState(false);
  // extract action items from gemini data
  const actionItems = useMemo(() => {
    return Array.isArray(geminiData?.action_items) ? geminiData!.action_items : [];
  }, [geminiData?.action_items]);
  // action items button disabled when loading or no action items
  const actionItemsDisabled = (
    isLoading || actionItems.length === 0
  );

  // normalize action items from gemini
  function normalizeActionItems(input: any): ActionItem[] {
    if (!Array.isArray(input)) {
      return [];
    }
    // return normalized action items
    return input.map((i) => ({
      id: String(i.id ?? undefined),
      action_item: String(i?.action_item ?? "").trim(),
      deadline: i?.deadline ? String(i.deadline) : null,
      completed: false // forcing completed to always be false at first
    })).filter((i) => i.action_item.length > 0); // no empty items
  }

  // help modal states
  const [helpVisible, setHelpVisible] = useState(false);

  // Calibration states
  const [calibVis, setCalibVis] = useState(false);
  const [calibLoad, setCalibLoad] = useState(false);
  const [calibErr, setCalibErr] = useState<string | null>(null);

  const [calibLower, setCalibLower] = useState<number | null>(null);
  const [calibHigher, setCalibHigher] = useState<number | null>(null);
  const [calibLowerTxt, setCalibLowerTxt] = useState<string>("");
  const [calibHigherTxt, setCalibHigherTxt] = useState<string>("");

  const [calibExpandVis, setCalibExpandVis] = useState(false);
  const [calibExpandTitle, setCalibExpandTitle] = useState<string>("");
  const [calibExpandText, setCalibExpandText] = useState<string>("");

  // prevents scan count from updating every render
  const imageUriRef = useRef<string | null>(null);

  // lookup table to get word definitions
  const definitionMap = useMemo(() => {
    // words being defined
    const words = geminiData?.complex_words ?? [];
    // definitions of words
    const definitions = geminiData?.complex_definitions ?? [];
    // create map to link words and definitions
    const map = new Map<string, string>();

    // keep shortest length between words and definitions arrays
    const minLength = Math.min(words.length, definitions.length);

    // iterate through both arrays
    for (let i = 0; i < minLength; i++) {
      // normalize word
      const word = (words[i] ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").trim();
      // trim definition string
      const definition = (definitions[i] ?? "").trim();

      // store if word and definition are both valid
      if (word && definition) {
        map.set(word, definition);
      }
    }

    // log array lengths
    console.log(`Complex words: ${words.length}\nComplex definitions: ${definitions.length}`)
    return map;
  }, [geminiData?.complex_words, geminiData?.complex_definitions]); // rebuild table when word and definitions change

  // lookup table to get word definitions for easy read tab
  const simpleDefinitionMap = useMemo(() => {
    // words being defined
    const words = geminiData?.simple_words ?? [];
    // definitions of words
    const definitions = geminiData?.simple_definitions ?? [];
    // create map to link words and definitions
    const map = new Map<string, string>();

    // keep shortest length between words and definitions arrays
    const minLength = Math.min(words.length, definitions.length);

    // iterate through both arrays
    for (let i = 0; i < minLength; i++) {
      // normalize word
      const word = (words[i] ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").trim();
      // trim definition string
      const definition = (definitions[i] ?? "").trim();

      // store if word and definition are both valid
      if (word && definition) {
        map.set(word, definition);
      }
    }

    // log array lengths
    console.log(`Simplified complex words: ${words.length}\nSimplified complex definitions: ${definitions.length}`)
    return map;
  }, [geminiData?.simple_words, geminiData?.simple_definitions]); // rebuild table when words and definitions change

  // close the definition modal by changing visibility but keep word/definition in state
  function closeDefinitionModal() {
    setDefinitionModal((prev) => ({ ...prev, isVisible: false }));
  }

  // look up definition from map, show modal with word/definition
  function openDefinitionModal(word: string) {
    let definition = undefined;

    if (tab === "Overview") {
      // look up definition for word
      definition = definitionMap.get(word);
    }
    // get definition from simple_definitions for simplified text
    if (tab === "Easy Read") {
      definition = simpleDefinitionMap.get(word);
    }
    // no definition, do nothing
    if (!definition) {
      return;
    }
    // show modal with word and definition
    setDefinitionModal({
      isVisible: true,
      word: word,
      definition: definition,
    });
  }



  // build version of ocr text with complex words highlighted
  const highlightedOriginal = useMemo(() => {
    // ocr text is always string
    const text = effectiveOcrText ?? "";
    // normalize complex words to lowercase for case insensitive checking
    const words = (geminiData?.complex_words ?? []).map(w => w.toLowerCase());

    // split ocr into tokens with whitespace kept for formatting
    return text.split(/(\s+)/).map((part, i) => {
      // if only whitespace, return it without <Text>
      if (!part.trim()) {
        return part;
      }
      // clean words to be lowercase with no punctuation/symbols
      const clean_words = part.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
      // check whether cleaned word exists in complex_words list
      const match = words.includes(clean_words);

      // render original token with highlights applied to matching words
      return (
        <AppText
          key={i}
          style={[match ? readerStyles.complexWord : readerStyles.bodyText, { color: match ? P.complexWord : P.bodyText }]}
          onPress={() => {
            if (match) {
              openDefinitionModal(clean_words);
            }
          }}
        >
          {part}
        </AppText>
      );
    });
  }, [effectiveOcrText, geminiData?.complex_words, darkMode]) // update when ocr text or complex_words list change

  // build version of simplification text with complex words highlighted
  const highlightedSimplified = useMemo(() => {
    // easy read tab text, always string
    const text = (simplifyMoreText === null ? geminiData?.simplification : simplifyMoreText) ?? "";
    // normalize complex words to lowercase
    const words = (geminiData?.simple_words ?? []).map(w => w.toLowerCase());

    //split easy read text into tokens, keep whitespace tokens
    return text.split(/(\s+)/).map((part, i) => {
      // return whitespace tokens
      if (!part.trim()) {
        return part;
      }
      // clean words of symbols, punctuation, cpaitalization
      const clean_words = part.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
      // check for complex word matches
      const match = words.includes(clean_words);

      // render text component with highlighted complex words
      return (
        <AppText
          key={i}
          style={[match ? readerStyles.complexWord : readerStyles.bodyText, darkMode && (match ? readerDarkStyles.complexWord : readerDarkStyles.bodyText)]}
          onPress={() => {
            if (match) {
              openDefinitionModal(clean_words);
            }
          }}
        >
          {part}
        </AppText>
      );
    });
  }, [simplifyMoreText, geminiData?.simplification, geminiData?.simple_words, tab, darkMode]); // update when simplification text/words or tab or dark mode state changes

  // calculate whether simplified level has reached minimum
  useEffect(() => {
    const isMost = simplifiedReadingLevel === 1;
    setSimplifiedMost(isMost);
    console.log("Simplified reading level:", simplifiedReadingLevel);
    console.log("Simplified most:", isMost);
  }, [simplifiedReadingLevel]);

  // reset simplify more states when new image taken
  useEffect(() => {
    setSimplifyMoreText(null);
    setSimplifyMoreCount(0);
    setSimplifiedReadingLevel(null);
    setSimplifiedMost(false);
    setDefinitionModal({ isVisible: false, word: "", definition: "" })
    setSessionReadingLevel(null);
    setOcrLanguage("unknown");

    setSavedDocLoading(false);
    setSavedDocPages([]);
    setSavedDocPageCount(1);
    setSavedDocCombinedText("");
    setSavedDocMode(null);

    // reset calibration states as well
    setCalibVis(false);
    setCalibLoad(false);
    setCalibErr(null);
    setCalibLower(null);
    setCalibHigher(null);
    setCalibLowerTxt("");
    setCalibHigherTxt("");
  }, [imageUri, docId]); // new image uri triggers

  // close modal when tab changes
  useEffect(() => {
    closeDefinitionModal();
  }, [tab]);

  // 
  async function getAuthToken() {
    const token = await storage.getItem("access_token");
    const tokenType = (await storage.getItem("token_type")) ?? "bearer";
    return {
      ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
    };
  }

  //update preferred language in db
  async function patchUserLang(newLang2: string): Promise<boolean> {
    const code2 = (newLang2 ?? "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code2)) return false;

    try {
      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type")) ?? "bearer";
      if (!token) return false;

      const res = await fetch(`${api_url}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${tokenType} ${token}`,
        },
        body: JSON.stringify({ language: code2 }),
      });
      return res.ok;
    } catch (e) {
      console.warn("patchUserLang failed:", e);
      return false;
    }
  }

  //re-process gemini flow to refresh translation -- no OCR re-process
  async function rerunGeminiWithNewLang(targetLang2: string) {
    if (ocrLoading || geminiLoading) return;
    if (!effectiveOcrText) return;

    const code2 = (targetLang2 ?? "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code2)) return;

    setGeminiLoading(true);
    setGeminiError(null);

    try {
      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type")) ?? "bearer";

      const response = await fetch(`${api_url}/gemini`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `${tokenType} ${token}` } : {})
        },
        body: JSON.stringify({
          text: effectiveOcrText,
          mode: effectiveMode ?? "Document",
          target_language: code2,
          ...(sessionReadingLevel !== null ? { reading_level: sessionReadingLevel } : {})
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Gemini response failed (HTTP ${response.status})`);
      }
      const json: GeminiResponse = await response.json();

      setGeminiData((prev) => {
        if (!prev) return json;
        return {
          ...prev,
          ...json,
          translation: (json.translation ?? prev.translation) ?? null
        };
      });
    } catch (e: any) {
      setGeminiError(e?.message ?? "Request failed");
    } finally {
      setGeminiLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "Translate") return;
    if (!effectiveOcrText) return;
    if (!userLang) return;
    if (!geminiData?.translation) {
      rerunGeminiWithNewLang(userLang);
    }
  }, [tab, userLang, effectiveOcrText, geminiData?.translation]);

  // get calibration state from db
  async function dbGetCalibState(): Promise<{
    scan_count: number;
    calib_freq: number;
    reading_level: number | null;
  } | null> {
    if (!api_url) return null;
    try {
      const tokenHeaders = await getAuthToken();
      const res = await fetch(`${api_url}/user/calib_state`, {
        method: "GET",
        headers: { "Content-Type": "application/json", ...tokenHeaders },
      });
      const json = await res.json();
      return {
        scan_count: Number(json.scan_count ?? 0),
        calib_freq: Number(json.calib_freq ?? 0),
        reading_level: (json.reading_level === null || json.reading_level === undefined) ? null : Number(json.reading_level),
      };
    } catch (e) {
      console.error("Error fetching calibration state:", e);
      return null;
    }
  }

  // increment scan count in db after each scan
  async function dbScanCountIncrement(): Promise<{
    scan_count: number;
    calib_freq: number;
    prompt: boolean;
    reading_level: number | null;
  } | null> {
    try {
      const tokenHeaders = await getAuthToken();
      const res = await fetch(`${api_url}/user/scan_count`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeaders },
        body: JSON.stringify({ event: "scan" }),
      });
      const json = await res.json();
      return {
        scan_count: Number(json.scan_count ?? 0),
        calib_freq: Number(json.calib_freq ?? 0),
        prompt: Boolean(json.prompt ?? false),
        reading_level: (json.reading_level === null || json.reading_level === undefined) ? null : Number(json.reading_level),
      };
    } catch (e) {
      console.error("Error incrementing scan count:", e);
      return null;
    }
  }

  // update reading level in db after calibration choice
  async function dbUpdateReadingLvl(payload: { new_level: number; choice: "lower" | "stay" | "higher"; }): Promise<boolean> {
    try {
      const tokenHeaders = await getAuthToken();
      const res = await fetch(`${api_url}/user/reading_level`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeaders },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (e) {
      console.error("Error updating reading level:", e);
      return false;
    }
  }

  async function getInt(key: string, defaultValue: number) {
    const value = await storage.getItem(key);
    const _value = Number(value);
    return Number.isFinite(_value) ? _value : defaultValue;
  }

  async function setInt(key: string, value: number) {
    await storage.setItem(key, value.toString());
  }

  async function getReadingLvl(): Promise<number | null> {
    const value = await storage.getItem(calibReadingLevelKey);
    const _value = Number(value);
    if (!Number.isFinite(_value)) return null;
    return clampInt(_value, 1, 9);
  }

  async function setReadingLvl(level: number) {
    await storage.setItem(calibReadingLevelKey, String(clampInt(level, 1, 9)));
  }

  // increment scan count
  async function incrScan(): Promise<{
    scan_count: number;
    calib_freq: number;
    prompt: boolean;
    reading_level: number | null;
  }> {
    let scanCount = await getInt(calibScanCountKey, 0);
    let calibFreq = await getInt(calibFreqKey, 0);
    if (!calibFreq || calibFreq < 1) {
      // change below values to adjust default calibration frequency -- maybe 10, 15 after testing is done
      calibFreq = randomIntInclusive(1, 2);
      await setInt(calibFreqKey, calibFreq);
    }
    scanCount += 1;
    await setInt(calibScanCountKey, scanCount);

    const prompt = scanCount >= calibFreq;
    const rLvl = await getReadingLvl();

    return { scan_count: scanCount, calib_freq: calibFreq, prompt: prompt, reading_level: rLvl };
  }

  async function fetchSimplifiedTxt(level: number): Promise<string> {
    const tokenHeaders = await getAuthToken();

    const res = await fetch(`${api_url}/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tokenHeaders },
      body: JSON.stringify({ text: effectiveOcrText, mode: effectiveMode ?? "Document", reading_level: level })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Gemini response failed (HTTP ${res.status})`);
    }
    const json: GeminiResponse = await res.json();
    return (json.simplification ?? "").trim();
  }

  async function openCalibModal(currLevel: number) {
    const { left, right } = CalibrateReadingLvl(currLevel);
    setCalibLower(left);
    setCalibHigher(right);
    setCalibVis(true);
    setCalibLoad(true);
    setCalibErr(null);
    setCalibLowerTxt("Loading...");
    setCalibHigherTxt("Loading...");
    try {
      const [lowerTxt, higherTxt] = await Promise.all([
        fetchSimplifiedTxt(left),
        fetchSimplifiedTxt(right)
      ]);
      setCalibLowerTxt(lowerTxt);
      setCalibHigherTxt(higherTxt);
      setCalibLoad(false);
    } catch (e: any) {
      setCalibErr(e.message ?? "Failed to load simplified text");
    } finally {
      setCalibLoad(false);
    }
  }

  function openCalibExpanded(which: "lower" | "higher") {
    if (calibLoad) return;
    if (calibErr) return;

    if (which === "lower") {
      setCalibExpandTitle("Option A - Lower");
      setCalibExpandText(calibLowerTxt || "");
    } else {
      setCalibExpandTitle("Option B - Higher");
      setCalibExpandText(calibHigherTxt || "");
    }
    setCalibVis(false);
    setTimeout(() => {
      setCalibExpandVis(true);
    }, 0);
  }

  function closeCalibExpanded() {
    setCalibExpandVis(false);
    setCalibVis(true);
  }

  function closeCalibModal() {
    setCalibExpandVis(false);
    setCalibVis(false);
    setCalibLoad(false);
    setCalibErr(null);
  }

  async function resetScanCount() {
    await setInt(calibScanCountKey, 0);
    // change below values to adjust default calibration frequency -- maybe 10, 15 after testing is done
    const next = randomIntInclusive(1, 2);
    await setInt(calibFreqKey, next);
  }

  async function setCalibChoice(choice: "lower" | "stay" | "higher") {
    const currLevel = sessionReadingLevel ?? geminiData?.reading_level ?? reading_levels.standard;
    const lowLevel = calibLower ?? CalibrateReadingLvl(currLevel).left;
    const highLevel = calibHigher ?? CalibrateReadingLvl(currLevel).right;

    const newLevel = choice === "lower" ? lowLevel : choice === "higher" ? highLevel : currLevel;

    const saveToDb = await dbUpdateReadingLvl({ new_level: newLevel, choice: choice });
    if (!saveToDb) {
      await setReadingLvl(newLevel);
      await resetScanCount();
    }

    closeCalibModal();

    setSessionReadingLevel(newLevel);
    await rerunGeminiWithLevel(newLevel);
  }

  async function checkIncrAndCalib() {
    if (!imageUri && !docId) return;

    if (imageUriRef.current === imageUri) return;

    imageUriRef.current = imageUri;

    const db = await dbScanCountIncrement();
    if (db) return;

    await incrScan();
  }

  useEffect(() => {
    checkIncrAndCalib();
  }, [imageUri, docId]);

  useEffect(() => {
    async function checkPrompt() {
      if (!imageUri && !docId) return;
      if (!effectiveOcrText) return;
      if (calibVis) return;

      const dbState = await dbGetCalibState();
      if (dbState) {
        const calibFreq = dbState.calib_freq || 0;
        const scanCount = dbState.scan_count || 0;

        if (calibFreq > 0 && scanCount >= calibFreq) {
          const currLevel = sessionReadingLevel ?? dbState.reading_level ?? geminiData?.reading_level ?? reading_levels.standard;
          await openCalibModal(currLevel);
        }
        return;
      }

      const scanCount = await getInt(calibScanCountKey, 0);
      const calibFreq = await getInt(calibFreqKey, 0);
      if (calibFreq > 0 && scanCount >= calibFreq) {
        const reading_level = await getReadingLvl();
        const currLevel = sessionReadingLevel ?? reading_level ?? geminiData?.reading_level ?? reading_levels.standard;
        await openCalibModal(currLevel);
      }
    }

    checkPrompt();
  }, [effectiveOcrText, calibVis, docId, imageUri, geminiData?.reading_level, sessionReadingLevel]);

  useEffect(() => {
    // prevent mounting issues
    let cancelled = false;

    // call backend ocr endpoint using captured image
    async function runOcrGeminiPipeline() {
      // no image uri, do nothing
      if (!imageUri && !docId) {
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

        let sourceText = "";
        let sourceLang = "unknown";
        let resolvedMode = typeof mode === "string" ? mode: "Document";

        if (docId) {
          setSavedDocLoading(true);
          const saved = await fetchSavedDocDetail(docId);

          if (saved) {
            const savedPages = Array.isArray(saved.pages) ? saved.pages : [];
            const joinedPages = savedPages
              .map((p) => (p.ocr_text ?? "").trim())
              .filter(Boolean)
              .join("\n\n");

            sourceText = (saved.combined_ocr_text ?? "").trim() || joinedPages;
            sourceLang =
              (savedPages.find((p) => (p.language ?? "").trim())?.language ?? "unknown");
            resolvedMode = saved.mode || resolvedMode;

            if (!cancelled) {
              setSavedDocPages(savedPages);
              setSavedDocPageCount(Math.max(saved.page_count ?? savedPages.length ?? 1, 1));
              setSavedDocCombinedText(sourceText);
              setSavedDocMode(saved.mode ?? null);
              setOcrText(sourceText);
              setOcrLanguage(sourceLang || "unknown");
            }
          }
          setSavedDocLoading(false);
        }

        // OCR
        if (!sourceText) {
          if (!imageUri) {
            throw new Error("No image for OCR is available");
          }
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
          sourceText = (data.text ?? "").trim();
          sourceLang = data.language ?? "unknown";

          // store ocr text if still mounted
          if (!cancelled) {
            setOcrText(sourceText);
            setOcrLanguage(sourceLang);
          }

          if (docId) {
            const text_preview = clampToTwoSentences(sourceText);
            if (text_preview) {
              await updatePreview(docId, text_preview);
            }
          }
        }
        if (!cancelled) {
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
            ...(token ? { Authorization: `${tokenType} ${token}` } : {})
          },
          body: JSON.stringify({ text: sourceText ?? "", mode: resolvedMode ?? "Document" })
        });
        // check response, handle error
        if (!geminiResponse.ok) {
          const text = await geminiResponse.text();
          throw new Error(text || `Gemini response failed (HTTP ${geminiResponse.status})`);
        }
        // grab and set json data
        const raw = await geminiResponse.json();
        const geminiJson: GeminiResponse = {
          ...raw,
          action_items: normalizeActionItems(raw.action_items)
        };

        console.log("\n---[ORIGINAL TEXT] COMPLEX WORDS/DEFS---\n")
        if (geminiJson.complex_words && geminiJson.complex_definitions) {
          for (const i in geminiJson.complex_words) {
            console.log(`${geminiJson.complex_words[i]}: ${geminiJson.complex_definitions[i]}`)
          }
        }
        console.log("\n---[SIMPLIFIED TEXT] COMPLEX WORDS/DEFS---\n")
        if (geminiJson.simple_words && geminiJson.simple_definitions) {
          for (const i in geminiJson.simple_words) {
            console.log(`${geminiJson.simple_words[i]}: ${geminiJson.simple_definitions[i]}`)
          }
        }


        // only set sessionreadinglevel if not null
        setSessionReadingLevel((prev) => prev === null ? (geminiJson.reading_level ?? null) : prev);

        try {
          const exists = await getReadingLvl();
          if (exists === null && geminiJson.reading_level) {
            await setReadingLvl(geminiJson.reading_level);
          }
        } catch {
          // do nothing on error
        }

        // update simplify more states
        setSimplifyMoreText(geminiJson.simplification);
        setSimplifiedReadingLevel(geminiJson.reading_level ?? null);
        setSimplifiedMost(geminiJson.reading_level === 1);

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
          setSavedDocLoading(false);
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
  }, [imageUri, mode, docId]);

  // update bookmark/badge doc mode label
  const badgeMode = useMemo(() => {
    // if doc mode is not auto-detect, return manually set mode
    if (mode && mode !== "Auto-detect") {
      return mode;
    }
    // if loading states, show 'detecting...'
    if (ocrLoading || geminiLoading) {
      return "";
    }
    // return the mode or auto-detect
    return effectiveMode ?? "Auto-detect";
  }, [mode, effectiveMode, ocrLoading, geminiLoading]); // when mode, loading states, or data changes

  // compute text to show inside reader card
  const content = useMemo(() => {
    // while loading, show nothing
    if (ocrLoading) return "";
    if (geminiLoading) return "";

    // if failure, show error message in content area
    if (ocrError) return `OCR error:\n\n${ocrError}`;
    if (geminiError) return `Gemini error:\n\n${geminiError}`;

    // if user wants original text, show ocr text
    if (tab === "Overview" && showOriginal) {
      return effectiveOcrText || "No text available. Please scan or upload a document to see the extracted text here.";
    }

    if (!geminiData) {
      return effectiveOcrText ? effectiveOcrText : "No text available. Please scan or upload a document to see the simplified text here.";
    }

    // grab returned action items if action items is an array, otherwise default to empty array
    const items = Array.isArray(geminiData.action_items) ? geminiData.action_items : [];

    // otherwise show content based on selected tab
    switch (tab) {
      case "Overview":
        // for now, format action items with summary as numbered list, n/a if no items
        return geminiData.summary;
      case "Easy Read":
        // simplified explanation for easy read tab
        return highlightedSimplified;
      case "Translate":
        const userLanguage = (userLang ?? "not set").toUpperCase();
        const ocrLang = (ocrLanguage ?? "unknown").toUpperCase();
        // translation for translate tab, tell user when no translation was provided and advise of user's saved language and ocr text language
        return geminiData.translation ?? `No translation available.\n\nYour language is set to ${langCodeToName(userLanguage)} and the text is written in ${langCodeToName(ocrLang)}.`;
      default:
        return "";
    }
  }, [tab, ocrLoading, ocrError, effectiveOcrText, highlightedSimplified, userLang, ocrLanguage,
    geminiLoading, geminiError, geminiData, showOriginal, simplifyMoreText]);

  // function for updating user's reading level on backend
  async function patchReadingLevel(newReadingLevel: number) {
    // check for valid api url
    if (!api_url) {
      return;
    }
    // get token adn token type from securestorage
    const token = await storage.getItem("access_token");
    const tokenType = (await storage.getItem("token_type")) ?? "bearer";
    // patch reading level, return new reading level
    const response = await fetch(`${api_url}/users/me/reading-level`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
      },
      body: JSON.stringify({ reading_level: newReadingLevel })
    });
    // invalid response, error
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to store reading level. HTTP ${response.status}`);
    }
    // parse json, return json reading level or newreadinglevel if null
    const json = await response.json();
    return json?.reading_level ?? newReadingLevel;
  }

  const screen = Dimensions.get("window");

  const cardHeight = Math.min(screen.height * 0.62, 560);

  async function rerunGeminiWithLevel(level: number) {
    if (!api_url) return;
    if (ocrLoading || geminiLoading) return;
    if (!effectiveOcrText) return;

    setGeminiLoading(true);
    setGeminiError(null);

    try {
      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type")) ?? "bearer";

      // reset "simplify more" 
      setSimplifyMoreCount(0);
      setSimplifyMoreText(null);
      setSessionReadingLevel(level);

      try { await setReadingLvl(level); } catch { /* do nothing on error */ }

      const response = await fetch(`${api_url}/gemini`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `${tokenType} ${token}` } : {})
        },
        body: JSON.stringify({
          text: effectiveOcrText,
          mode: effectiveMode ?? "Document",
          reading_level: level
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Gemini response failed (HTTP ${response.status})`);
      }

      // noramlize action items in gemini data
      const raw = await response.json();
      const json: GeminiResponse = {
        ...raw,
        action_items: normalizeActionItems(raw.action_items)
      }
      const newLevel = (typeof json.reading_level === "number" ? json.reading_level : level);

      setSessionReadingLevel(newLevel);
      setSimplifyMoreCount(0);
      setGeminiData(json);
      setSimplifyMoreText(json.simplification ?? null);
      setSimplifiedReadingLevel(newLevel);
      setSimplifiedMost(newLevel === 1);

      try {
        await patchReadingLevel(newLevel);
      } catch (e: any) {
        console.warn("Failed to store reading level:", e?.message ?? e);
      }
      if (docId) {
        const text_preview = clampToTwoSentences(json.simplification || json.summary || "");
        if (text_preview) {
          await updatePreview(docId, text_preview);
        }
      }
    } catch (e: any) {
      setGeminiError(e?.message ?? "Request failed");
    } finally {
      setGeminiLoading(false);
    }
  }

  async function onSelectLanguage(code2: string) {
    const newCode2 = (code2 ?? "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(newCode2)) return;

    setLangPickerVisible(false);
    setLangSearch("");
    setUserLang(newCode2);

    const ok = await patchUserLang(newCode2);
    if (!ok) {
      console.warn("Failed to update user language in db");
    }
    await rerunGeminiWithNewLang(newCode2);
  }

  const shareDisabled = isLoading ||  !getShareText();

  console.log("TTS SPEECH CHECK", {
    tab, speechText: getSpeechText(),
    speechTextType: typeof getSpeechText(),
    speechTextLength: getSpeechText()?.length,
    hasSpeechText
  });

  return (
    <SafeAreaView style={[readerStyles.safe, darkMode && readerDarkStyles.safe]}>
      <View style={[readerStyles.container, darkMode && readerDarkStyles.container]}>
        {/* Header */}
        <View style={readerStyles.header}>
          <Pressable style={readerStyles.headerIconBtn} onPress={() => { }}>
            <AppText style={readerStyles.headerIcon}>☰</AppText>
          </Pressable>

          <AppText style={readerStyles.headerTitle}>SayItSimply</AppText>

          <Pressable style={readerStyles.avatarBtn} onPress={() => { }}>
            <View style={readerStyles.avatarPlaceholder} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator
          indicatorStyle={P.scrollIndicator as any}
          onScrollBeginDrag={closeDefinitionModal}
        >

          {/* Top Tabs */}
          <View style={readerStyles.tabRow}>
            <TopTab 
              label="Overview" 
              active={tab === "Overview"} 
              onPress={() => setTab("Overview")} 
              disabled={tabsDisabled}
            />
            <TopTab 
              label="Easy Read" 
              active={tab === "Easy Read"} 
              onPress={() => setTab("Easy Read")} 
              disabled={tabsDisabled}
            />
            <TopTab 
              label="Translate" 
              active={tab === "Translate"} 
              onPress={() => setTab("Translate")} 
              disabled={tabsDisabled}
            />
          </View>

          {/* Card Area */}
          <View style={[readerStyles.outerCard, darkMode && readerDarkStyles.outerCard, { height: cardHeight, borderColor: P.outerBorder, backgroundColor: P.midCard }]}>
            {/* Badge */}
            <View style={readerStyles.badge}>
              <AppText style={readerStyles.badgeText}>
                {badgeMode}
                {showLangLabel ? "\n\n" : ""}
                {showLangLabel ? (
                  <AppText style={[readerStyles.badgeText, { fontSize: 16, color: '#F2D3AC', fontWeight: '900' }]}>
                    {langLabel}
                  </AppText>
                ) : null}
              </AppText>
              <View style={[readerStyles.badgeNotch, { borderBottomColor: P.badgeNotch }]}/>
            </View>

            {/* Inner "paper" */}
            <View style={[readerStyles.innerPaper, darkMode && readerDarkStyles.innerPaper]}>
              <View style={readerStyles.paperTopRow}>
                {/* action items icon */}
                <Pressable
                  style={[readerStyles.actionItemBtn,
                    actionItemsDisabled && { backgroundColor: 'transparent', borderColor: 'transparent' },
                    darkMode && readerDarkStyles.actionItemBtn, actionItemsDisabled && darkMode && readerDarkStyles.actionItemBtnDisabled
                  ]}
                  onPress={() => {
                    closeDefinitionModal();
                    setActionItemsVisible(true);
                  }}
                  disabled={actionItemsDisabled}
                  hitSlop={10}
                  accessibilityRole='button'
                  accessibilityLabel="Open Action Items"
                >
                  <Ionicons
                    name="menu-outline"
                    size={30}
                    color={actionItemsDisabled ? P.iconDisabled : P.icon}
                  />
                </Pressable>

                {/*lang code fab*/}
                {!isLoading && (  
                  <Pressable
                    style={[
                      readerStyles.helpFab, darkMode && readerDarkStyles.helpFab
                    ]}
                    onPress={() => setHelpVisible(true)}
                  >
                    <Ionicons
                      name="help"
                      color={P.icon}
                      size={32}
                    />
                  </Pressable>)}
              </View>

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
                    color={P.indicator}
                  />
                  <AppText style={{
                    fontWeight: '600',
                    fontSize: 24,
                    textAlign: 'center',
                    justifyContent: 'center',
                    color: P.bodyText
                  }}
                  >
                    {ocrLoading ? "Reading your text..."
                      : "Rewriting your text..."}
                  </AppText>
                </View>
              )}

              {savedDocPageCount > 1 && !isLoading && (
                <AppText style={[readerStyles.pageMeta, { color: P.mutedText }]}>
                  {savedDocPageCount} pages
                </AppText>
              )}

              {/* Body text */}
              <ScrollView
                style={readerStyles.bodyScroll}
                contentContainerStyle={readerStyles.bodyScrollContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps='handled'
                indicatorStyle={P.scrollIndicator as any}
                onScrollBeginDrag={closeDefinitionModal}
              >
                  {tab === "Overview" && showOriginal ? (
                    hasDisplayPages ? (
                      <View>
                        {displayPages.map((page) => {
                          const pageText = (page.ocr_text ?? "").trim();
                          const words = (geminiData?.complex_words ?? []).map(w => w.toLowerCase());

                          const highlightedPage = pageText.split(/(\s+)/).map((part, i) => {
                            if (!part.trim()) {
                              return part;
                            }

                            const cleanWord = part.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
                            const match = words.includes(cleanWord);

                            return (
                              <AppText
                                key={`${page.page_num}-${i}`}
                                style={[
                                  match ? readerStyles.complexWord : readerStyles.bodyText,
                                  { color: match ? P.complexWord : P.bodyText }
                                ]}
                                onPress={() => {
                                  if (match) {
                                    openDefinitionModal(cleanWord);
                                  }
                                }}
                              >
                                {part}
                              </AppText>
                            );
                          });

                          return (
                            <View key={`page-${page.page_num}`} style={readerStyles.pageBlock}>
                              {savedDocPageCount > 1 && (
                                <AppText style={[readerStyles.pageTitle, { color: "#8C311C" }]}>
                                  PAGE {page.page_num}
                                </AppText>
                              )}

                              {highlightEnabled ? (
                                <AppText style={{ flexDirection: "row", flexWrap: "wrap" }}>
                                  {highlightedPage}
                                </AppText>
                              ) : (
                                <AppText style={[readerStyles.bodyText, { color: P.bodyText }]}>
                                  {pageText}
                                </AppText>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ) : highlightEnabled ? (
                      <AppText style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {highlightedOriginal}
                      </AppText>
                    ) : (
                      <AppText style={[readerStyles.bodyText, { color: P.bodyText }]}>
                        {effectiveOcrText}
                      </AppText>
                    )
                  ) : tab === "Easy Read" ? (
                    highlightEnabled ? (
                      <AppText style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {highlightedSimplified}                    
                      </AppText>
                    ) : (
                      <AppText style={[readerStyles.bodyText, { color: P.bodyText }]}>
                        {(
                          (simplifyMoreText === null ? (geminiData?.simplification ?? "") : (simplifyMoreText ?? ""))
                        ).trim()}
                      </AppText>
                    )
                  ) : (
                    <AppText style={[readerStyles.bodyText, { color: P.bodyText }]}>{content}</AppText>
                  )}
              </ScrollView>

              {/* Bottom CTA and TTS */}
              {tab !== "Translate" && (
                <View style={readerStyles.ctaRow}>
                  <Pressable
                    style={[
                      readerStyles.ctaBtn,
                      darkMode && readerDarkStyles.ctaBtn,
                      (ocrLoading || geminiLoading || !effectiveOcrText || simplifiedMost) &&
                      (darkMode ? readerDarkStyles.ctaBtnDisabled : { opacity: 0.5 }), { flex: 1 }
                    ]}
                    onPress={async () => {
                      if (tab === "Overview") {
                        setShowOriginal(!showOriginal);
                        return;
                      }
                      
                      if (tab === "Easy Read") {
                        if (simplifiedMost || simplifiedReadingLevel === 1 || sessionReadingLevel === 1) {
                          return;
                        }
                        if (ocrLoading || geminiLoading || !effectiveOcrText) {
                          return;
                        }
                        if (!api_url) {
                          return;
                        }

                        setGeminiLoading(true);
                        setGeminiError(null);

                        try {
                          const token = await storage.getItem("access_token");
                          const tokenType = (await storage.getItem("token_type")) ?? "bearer";

                          const nextSimplifyStep = simplifyMoreCount + 1;
                          setSimplifyMoreCount(nextSimplifyStep);

                          const simplifyMoreBy = 2 * nextSimplifyStep;


                          const response = await fetch(`${api_url}/gemini`, {
                            method: 'POST',
                            headers: {
                              "Content-Type": "application/json",
                              ...(token ? { Authorization: `${tokenType} ${token}` } : {})
                            },
                            body: JSON.stringify({
                              text: effectiveOcrText,
                              mode: effectiveMode ?? "Document",
                              simplify_more_by: simplifyMoreBy,
                              ...(sessionReadingLevel !== null ? { reading_level: sessionReadingLevel } : {})
                            })
                          });

                          if (!response.ok) {
                            const text = await response.text();
                            throw new Error(text || `Gemini response failed (HTTP ${response.status})`);
                          }

                          const json: GeminiResponse = await response.json();

                          setSimplifyMoreText(json.simplification);
                          setSimplifiedReadingLevel(json.reading_level ?? null);
                          setSimplifiedMost(json.reading_level === 1);
                          if (json.reading_level != null) {
                            await patchReadingLevel(json.reading_level);
                          }
                          if (docId) {
                            const text_preview = clampToTwoSentences(json.simplification || json.summary || "");
                            if (text_preview) {
                              await updatePreview(docId, text_preview);
                            }
                          }
                        }
                        catch (e: any) {
                          setGeminiError(e?.message ?? "Request failed");
                        }
                        finally {
                          setGeminiLoading(false);
                          setDefinitionModal({ isVisible: false, word: "", definition: "" })
                        }
                      }
                    }}
                    disabled={
                      tabsDisabled || 
                      !effectiveOcrText || 
                      (tab === "Easy Read" && 
                        (simplifiedMost || 
                          simplifiedReadingLevel === 1 || 
                          sessionReadingLevel === 1
                        )
                      )
                    }>
                    <AppText style={[readerStyles.ctaText, darkMode && readerDarkStyles.ctaText]}>
                      {tab === "Easy Read" && simplifiedMost ? "Already Simplest"
                        : (tab === "Overview" && !showOriginal) ? "See Original Text"
                          : (tab === "Overview" && showOriginal) ? "See Simplified Text"
                            : (tab != "Overview") ? "Simplify More"
                              : "Simplify More"}
                    </AppText>
                  </Pressable>
                  <View style={readerStyles.ttsRow}>
                    <Pressable
                      style={[
                        readerStyles.ttsBtn,
                        ttsPlayDisabled && readerStyles.ttsBtnDisabled,
                        darkMode && readerDarkStyles.ttsBtn,
                        ttsPlayDisabled && darkMode && readerDarkStyles.ttsBtnDisabled,
                      ]}
                      onPress={() => {
                        closeDefinitionModal();
                        speechCurrentTab();
                      }}
                      disabled={ttsPlayDisabled}
                      hitSlop={10}
                    >
                      <Ionicons
                        name={ttsIsGenerating || ttsIsStopping ? "time-outline" : (ttsIsPlaying ? "volume-high-outline" : "play-circle-outline")}
                        size={28}
                        color={ttsPlayDisabled ? P.iconDisabled : ctaIcon}
                      />
                    </Pressable>

                    <Pressable
                      style={[
                        readerStyles.ttsBtn,
                        readerStyles.ttsStopBtn,
                        ttsStopDisabled && readerStyles.ttsBtnDisabled,
                        darkMode && readerDarkStyles.ttsBtn,
                        darkMode && readerDarkStyles.ttsStopBtn,
                        ttsStopDisabled && darkMode && readerDarkStyles.ttsBtnDisabled,
                      ]}
                      onPress={() => {
                        closeDefinitionModal();
                        stopAndCleanSound();
                      }}
                      disabled={ttsStopDisabled}
                      hitSlop={10}
                    >
                      <Ionicons
                        name="stop-circle-outline"
                        size={28}
                        color={ttsStopDisabled ? P.iconDisabled : ctaIcon}
                      />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {tab === "Overview" && (
          <View style={readerStyles.translateControlsWrap}>
            <Pressable
              style={[
                readerStyles.langPickerBtn,
                shareDisabled && readerStyles.ttsBtnDisabled,
                darkMode && readerDarkStyles.langPickerBtn,
                shareDisabled && darkMode && readerDarkStyles.ttsBtnDisabled,
              ]}
              onPress={() => {
                closeDefinitionModal();
                shareSummary();
              }}
              disabled={shareDisabled}
              hitSlop={10}
            >
              <Ionicons
                name="share-social-outline"
                size={22}
                color={shareDisabled ? P.iconDisabled : P.icon}
              />
              <AppText style={[readerStyles.langPickerBtnText, darkMode && readerDarkStyles.langPickerBtnText]}>
                Share Summary
              </AppText>
            </Pressable>
          </View>
        )}

        {tab === "Easy Read" && (
          <View style={readerStyles.levelControlsWrap}>
            <DetailLevelTab
              label="Standard"
              hint="More detail"
              icon={<Ionicons name="book-outline" size={22} color={P.icon}/>}
              active={sessionReadingLevel === reading_levels.standard}
              onPress={() => rerunGeminiWithLevel(reading_levels.standard)}
              darkMode={darkMode}
              disabled={tabsDisabled}
            />

            <DetailLevelTab
              label="Simple"
              hint="Easier words"
              icon={<Ionicons name="reader-outline" size={22} color={P.icon}/>}
              active={sessionReadingLevel === reading_levels.simple}
              onPress={() => rerunGeminiWithLevel(reading_levels.simple)}
              darkMode={darkMode}
              disabled={tabsDisabled}
            />

            <DetailLevelTab
              label="Super"
              hint="Most simple"
              icon={<Ionicons name="sparkles-outline" size={22} color={P.icon}/>}
              active={sessionReadingLevel === reading_levels.super_simple}
              onPress={() => rerunGeminiWithLevel(reading_levels.super_simple)}
              darkMode={darkMode}
              disabled={tabsDisabled}
            />
          </View>
        )}

        {/* Language picker */}
        {tab === "Translate" && (
          <View style={readerStyles.translateControlsWrap}>
            <View style={readerStyles.translateControlsRow}>
              <Pressable
                style={[readerStyles.langPickerBtn, darkMode && readerDarkStyles.langPickerBtn]}
                onPress={() => setLangPickerVisible(true)}
                hitSlop={10}
              >
                <Ionicons name="language-outline" size={22} color={P.icon}/>
                <AppText style={[readerStyles.langPickerBtnText, darkMode && readerDarkStyles.langPickerBtnText]}>
                  {(userLang ?? "EN").toUpperCase()}
                </AppText>
              </Pressable>

              <View style={readerStyles.ttsRow}>
                <Pressable
                  style={[
                    readerStyles.ttsBtn,
                    ttsPlayDisabled && readerStyles.ttsBtnDisabled,
                    darkMode && readerDarkStyles.ttsBtn,
                    ttsPlayDisabled && darkMode && readerDarkStyles.ttsBtnDisabled,
                  ]}
                  onPress={() => {
                    closeDefinitionModal();
                    speechCurrentTab();
                  }}
                  disabled={ttsPlayDisabled}
                  hitSlop={10}
                >
                  <Ionicons
                    name={ttsIsGenerating || ttsIsStopping ? "time-outline" : (ttsIsPlaying ? "volume-high-outline" : "play-circle-outline")}
                    size={28}
                    color={ttsPlayDisabled ? P.iconDisabled : P.icon}
                  />
                </Pressable>

                <Pressable
                  style={[
                    readerStyles.ttsBtn,
                    readerStyles.ttsStopBtn,
                    (!ttsIsPlaying && !ttsIsGenerating) && readerStyles.ttsBtnDisabled,
                    darkMode && readerDarkStyles.ttsBtn,
                    darkMode && readerDarkStyles.ttsStopBtn,
                    (!ttsIsPlaying && !ttsIsGenerating) && darkMode && readerDarkStyles.ttsBtnDisabled,
                  ]}
                  onPress={() => {
                    closeDefinitionModal();
                    stopAndCleanSound();
                  }}
                  disabled={ttsStopDisabled}
                  hitSlop={10}
                >
                  <Ionicons
                    name="stop-circle-outline"
                    size={28}
                    color={ttsStopDisabled ? P.iconDisabled : P.icon}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Language Modal */}
      <Modal
        transparent
        visible={langPickerVisible}
        animationType="fade"
        onRequestClose={() => setLangPickerVisible(false)}
      >
        <View style={[readerStyles.langModalBg, darkMode && readerDarkStyles.langModalBg]}>
          <Pressable style={readerStyles.fullFill} onPress={() => setLangPickerVisible(false)} />

          <KeyboardAvoidingView
            style={readerStyles.langModalCenter}
          >
            <View style={[readerStyles.langModalCard, darkMode && readerDarkStyles.langModalCard]}>
              <AppText style={[readerStyles.langModalTitle, darkMode && { color: P.bodyText }]}>Choose Language</AppText>

              <View style={[readerStyles.langSearchWrap, darkMode && readerDarkStyles.langSearchWrap]}>
                <Ionicons name="search-outline" size={18} color={darkMode ? P.bodyText : "#1B1B1B"}/>
                <TextInput
                  value={langSearch}
                  onChangeText={setLangSearch}
                  placeholder="Search language..."
                  placeholderTextColor={P.placeholder}
                  style={[readerStyles.langSearchInput, darkMode && readerDarkStyles.langSearchInput]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {!!langSearch && (
                  <Pressable onPress={() => setLangSearch("")} hitSlop={10}>
                    <Ionicons name="close-circle" size={18} color={darkMode ? P.placeholder : "rgba(0,0,0,0.55)"}/>
                  </Pressable>
                )}
              </View>

              <AppText style={[readerStyles.langCurrent, darkMode && { color: P.mutedText }]}>
                Current: <AppText style={{ fontWeight: "900", color: P.bodyText }}>{(userLang ?? "EN").toUpperCase()}</AppText>{" "}
                ({langCodeToName((userLang ?? "EN").toUpperCase())})
              </AppText>

              <FlatList
                data={filteredLangs}
                keyExtractor={(item) => item.code2}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 10 }}
                renderItem={({ item }) => {
                  const isSelected = (userLang ?? "EN").toUpperCase() === item.code2;
                  return (
                    <Pressable
                      style={[readerStyles.langRow, isSelected && readerStyles.langRowSelected]}
                      onPress={() => onSelectLanguage(item.code2)}
                    >
                      <View style={readerStyles.langRowLeft}>
                        <AppText style={[readerStyles.langCode, darkMode && { color: P.bodyText }]}>{item.code2}</AppText>
                        <AppText style={[readerStyles.langName, darkMode && { color: P.bodyText }]}>{item.name}</AppText>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#2C9AA4" />
                      )}
                    </Pressable>
                  );
                }}
              />

              <Pressable
                style={readerStyles.langCloseBtn}
                onPress={() => setLangPickerVisible(false)}
              >
                <AppText style={readerStyles.langCloseBtnText}>Close</AppText>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Calibration Modal */}
      <Modal
        transparent
        visible={calibVis}
        animationType="fade"
        onRequestClose={closeCalibModal}
      >
        <View style={[readerStyles.calibBackground, darkMode && { backgroundColor: P.modalBackdrop }]}>
          <Pressable style={readerStyles.calibBackdrop} onPress={closeCalibModal}/>
          <View style={readerStyles.calibCenter} pointerEvents="box-none">
            <View style={[readerStyles.calibModalCard,  { backgroundColor: P.modalCardBg, borderColor: P.cardBorder }]}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={readerStyles.calibBodyContent}
                showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" indicatorStyle={P.scrollIndicator as any}
              >
                <AppText style={[readerStyles.calibTitle, darkMode && { color: P.bodyText }]}>Tune Responses</AppText>

                {calibLoad ? (
                  <View style={readerStyles.calibLoadRow}>
                    <ActivityIndicator size={22} color={P.indicator} />
                    <AppText style={[readerStyles.calibLoadTxt, darkMode && { color: P.bodyText }]}>Loading...</AppText>
                  </View>
                ) : calibErr ? (
                  <AppText style={[readerStyles.calibErrTxt, darkMode && { color: P.bodyText }]}>{calibErr}</AppText>
                ) : (
                  <View style={readerStyles.calibOptsRow}>
                    <Pressable
                      style={[readerStyles.calibOpt, darkMode && readerDarkStyles.calibOpt]}
                      onPress={() => openCalibExpanded("lower")}
                      disabled={calibLoad || !!calibErr}
                    >
                      <View style={[readerStyles.calibOptHeader, darkMode && readerDarkStyles.calibOptHeader]}>
                        <AppText style={[readerStyles.calibOptHeaderTxt, darkMode && { color: P.bodyText }]}> Option A - Lower</AppText>
                      </View>
                      <AppText style={[readerStyles.calibOptTxt, darkMode && { color: P.bodyText }]}>{calibLowerTxt}</AppText>
                    </Pressable>

                    <Pressable
                      style={[readerStyles.calibOpt, darkMode && readerDarkStyles.calibOpt]}
                      onPress={() => openCalibExpanded("higher")}
                      disabled={calibLoad || !!calibErr}
                    >
                      <View style={[readerStyles.calibOptHeader, darkMode && readerDarkStyles.calibOptHeader]}>
                        <AppText style={[readerStyles.calibOptHeaderTxt, darkMode && { color: P.bodyText }]}> Option B - Higher</AppText>
                      </View>
                      <AppText style={[readerStyles.calibOptTxt, darkMode && { color: P.bodyText }]}>{calibHigherTxt}</AppText>
                    </Pressable>
                  </View>
                )}

                <View style={readerStyles.calibBtnRow}>
                  <Pressable
                    style={[readerStyles.calibBtn, readerStyles.calibBtnLow, darkMode && { backgroundColor: "#809BCE"}]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("lower");
                    }}
                  >
                    <AppText style={readerStyles.calibChoiceDarkTxt}>Choose Option A</AppText>
                  </Pressable>

                  <Pressable
                    style={[readerStyles.calibBtn, readerStyles.calibBtnStay, darkMode && { backgroundColor: "#604D53"}]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("stay");
                    }}
                  >
                    <AppText style={darkMode ? readerStyles.calibChoiceTxt : readerStyles.calibChoiceDarkTxt}>Neither - Don't change</AppText>
                  </Pressable>

                  <Pressable
                    style={[readerStyles.calibBtn, readerStyles.calibBtnHigh, darkMode && { backgroundColor: "#809BCE"}]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("higher");
                    }}
                  >
                    <AppText style={readerStyles.calibChoiceDarkTxt}>Choose Option B</AppText>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Option Expander Modal */}
      <Modal
        transparent
        visible={calibExpandVis}
        animationType="fade"
        onRequestClose={closeCalibExpanded}
      >
        <View style={[readerStyles.calibBackground, darkMode && { backgroundColor: P.modalBackdrop }]}>
          <Pressable style={readerStyles.calibBackdrop} onPress={closeCalibExpanded}/>
          <View style={readerStyles.calibCenter} pointerEvents="box-none">
            <View style={[readerStyles.calibModalCard, darkMode && { backgroundColor: P.modalCardBg, borderColor: P.cardBorder }]}>
              <View
                style={readerStyles.paperTopRow}
              >
                <AppText style={[readerStyles.calibTitle, darkMode && { color: P.bodyText }]}>{calibExpandTitle}</AppText>
                <Pressable onPress={closeCalibExpanded} hitSlop={10}>
                  <Ionicons name="close" size={26} color={darkMode ? P.bodyText : "black"} />
                </Pressable>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={readerStyles.calibBodyContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                indicatorStyle={P.scrollIndicator as any}
              >
                <AppText style={[readerStyles.calibOptTxt, darkMode && { color: P.bodyText }]}>{calibExpandText}</AppText>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complex Word Definition Modal */}
      <Modal
        transparent
        visible={definitionModal.isVisible}
        animationType="fade"
        onRequestClose={closeDefinitionModal}
      >
        <Pressable
          style={[readerStyles.definitionBackground, darkMode && readerDarkStyles.definitionBackground]}
          onPress={closeDefinitionModal}
        >
          <Pressable
            style={[readerStyles.definitionModalCard, darkMode && readerDarkStyles.definitionModalCard]}
            onPress={() => { }}
          >
            <AppText style={[readerStyles.definitionModalWordText, darkMode && readerDarkStyles.definitionModalWordText]}>
              {definitionModal.word}
            </AppText>
            <AppText style={[readerStyles.definitionModalDefinitionText, darkMode && readerDarkStyles.definitionModalDefinitionText]}>
              {definitionModal.definition}
            </AppText>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Action Items Modal */}
      <ActionItemModal
        visible={actionItemsVisible}
        onClose={() => setActionItemsVisible(false)}
        actionItems={actionItems}
        onAddItems={async (selected) => {
          console.log("Add to To-Do:", selected);

          try {
            if (!api_url) {
              return;
            }
            // get access token and token type
            const token = await storage.getItem("access_token");
            const tokenType = (await storage.getItem("token_type")) ?? "bearer";
            if (!token) {
              return;
            }
            // post to todo endpoint selected action items
            const response = await fetch(`${api_url}/users/me/todo`, {
              method: "POST",
              headers: {
                'Content-Type': 'application/json',
                Authorization: `${tokenType} ${token}`
              },
              body: JSON.stringify({ action_items: selected})
            });
            // error if bad response
            if (!response.ok) {
              const text = await response.text();
              throw new Error(text || `Failed to add to To-Do - HTTP ${response.status}`);
            }
            // capture updated to-do list
            const updated = await response.json();
            // log to console
            console.log("Updated To-Do List:", updated);
            // close the action items modal
            setActionItemsVisible(false);
          }
          catch (e: any) {
            // console warning if failure
            console.warn("Failed to add to To-Do:", e?.message ?? e);
          }
        }}
      />

      <HelpModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />

    </SafeAreaView>
  );
}

function TopTab({
  label,
  active,
  onPress,
  disabled = false
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        readerStyles.topTab, 
        active ? readerStyles.topTabActive : readerStyles.topTabInactive,
        disabled && {opacity: 0.5}]}
      hitSlop={8}
    >
      <AppText style={[readerStyles.topTabText, active ? readerStyles.topTabTextActive : readerStyles.topTabTextInactive]}>
        {label}
      </AppText>
    </Pressable>
  );
}

function DetailLevelTab({
  label,
  hint,
  icon,
  active,
  onPress,
  darkMode,
  disabled = false
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  darkMode: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        readerStyles.levelTab,
        active ? readerStyles.levelTabActive : readerStyles.levelTabInactive,
        darkMode && (active ? readerDarkStyles.levelTabActive : readerDarkStyles.levelTabInactive),
        disabled && {opacity: 0.5}
      ]}
      hitSlop={8}
    >
      {icon}
      <AppText style={[ readerStyles.levelTabText, darkMode && readerDarkStyles.levelTabText]}>
        {label}
      </AppText>
      <AppText style={[ readerStyles.levelTabHint, darkMode && readerDarkStyles.levelTabHint]}>
        {hint}
      </AppText>
    </Pressable>
  );
}
