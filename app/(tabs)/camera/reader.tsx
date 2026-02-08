import storage from '@/app/storage';
import ActionItemModal from '@/components/ActionItemModal';
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// reader screen tabs
type ReaderTab = "Overview" | "Easy Read" | "Translate";

// custom action item type to match gemini output
type ActionItem = {
  action_item: string;
  deadline: string | null; // null if no deadline
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

const calibScanCountKey = "calib_scan_count";
const calibFreqKey = "calib_freq";
const calibReadingLevelKey = "user_reading_level";

// backend fastapi url
const api_url = process.env.EXPO_PUBLIC_API_URL;

// takes in language code, returns full language name
function langCodeToName(code: string): string {
  const langMap: { [key: string]: string } = {
    EN: "English",
    ES: "Spanish",
    FR: "French",
    DE: "German"
  }
  return langMap[code] ?? code; // return code if not in map
}

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

// randomizer functions
function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function randomIntInclusive(min: number, max: number) {
  const _min = Math.ceil(min);
  const _max = Math.floor(max);
  return Math.floor(Math.random() * (_max - _min + 1)) + _min;
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
  const { imageUri, mode } = useLocalSearchParams<{
    imageUri?: string;
    mode?: string;
  }>();

  // ocr request states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [ocrLanguage, setOcrLanguage] = useState<string>("unknown");

  const [userLang, setUserLang] = useState<string | null>(null);



  // gemini request states
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [geminiData, setGeminiData] = useState<GeminiResponse | null>(null);

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

  // overall loading state
  const isLoading = ocrLoading || geminiLoading;
  // only show language label under these conditions
  const showLangLabel = !isLoading && !ocrError && !!ocrText && ocrLanguage !== "unknown";
  // formatted language label (capitalized or N/A)
  const langLabel = ocrLanguage && ocrLanguage !== "unknown" ? ocrLanguage.toUpperCase() : "N/A";

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

  // Calibration states
  const [calibVis, setCalibVis] = useState(false);
  const [calibLoad, setCalibLoad] = useState(false);
  const [calibErr, setCalibErr] = useState<string | null>(null);

  const [calibLower, setCalibLower] = useState<number | null>(null);
  const [calibHigher, setCalibHigher] = useState<number | null>(null);
  const [calibLowerTxt, setCalibLowerTxt] = useState<string>("");
  const [calibHigherTxt, setCalibHigherTxt] = useState<string>("");

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
    const text = ocrText ?? "";
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
        <Text
          key={i}
          style={match ? styles.complexWord : styles.bodyText}
          onPress={() => {
            if (match) {
              openDefinitionModal(clean_words);
            }
          }}
        >
          {part}
        </Text>
      );
    });
  }, [ocrText, geminiData?.complex_words]) // update when ocr text or complex_words list change

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
        <Text
          key={i}
          style={match ? styles.complexWord : styles.bodyText}
          onPress={() => {
            if (match) {
              openDefinitionModal(clean_words);
            }
          }}
        >
          {part}
        </Text>
      );
    });
  }, [simplifyMoreText, geminiData?.simplification, geminiData?.simple_words, tab]); // update when simplification text/words or tab state changes

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

    // reset calibration states as well
    setCalibVis(false);
    setCalibLoad(false);
    setCalibErr(null);
    setCalibLower(null);
    setCalibHigher(null);
    setCalibLowerTxt("");
    setCalibHigherTxt("");
  }, [imageUri]); // new image uri triggers

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
    const normalizeMode = typeof mode === "string" ? mode : Array.isArray(mode) ? mode[0] : geminiData?.mode ?? "Auto-detect";
    const tokenHeaders = await getAuthToken();
    const res = await fetch(`${api_url}/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tokenHeaders },
      body: JSON.stringify({ text: ocrText, mode: normalizeMode, reading_level: level }),
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

  function closeCalibModal() {
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
    if (!imageUri) return;

    if (imageUriRef.current === imageUri) return;

    imageUriRef.current = imageUri;

    const db = await dbScanCountIncrement();
    if (db) return;

    await incrScan();
    const local = await incrScan();
    const currLevel = sessionReadingLevel ?? local.reading_level ?? geminiData?.reading_level ?? reading_levels.standard;
    if (local.prompt) {
      return;
    }
  }

  useEffect(() => {
    checkIncrAndCalib();
  }, [imageUri]);

  useEffect(() => {
    async function checkPrompt() {
      if (!imageUri) return;
      if (!ocrText) return;
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
  }, [ocrText]);

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
          setOcrLanguage(data.language ?? "unknown");
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
          body: JSON.stringify({ text: data.text ?? "", mode: mode ?? "Document" })
        });
        // check response, handle error
        if (!geminiResponse.ok) {
          const text = await geminiResponse.text();
          throw new Error(text || `Gemini response failed (HTTP ${geminiResponse.status})`);
        }
        // grab and set json data
        const geminiJson: GeminiResponse = await geminiResponse.json();
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
        setSessionReadingLevel((prev) => (prev === null ? (geminiJson.reading_level ?? null) : prev));

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
      return "";
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

    // if user wants original text, show ocr text
    if (tab === "Overview" && showOriginal) {
      return ocrText || "No OCR text available.";
    }

    if (!geminiData) {
      return ocrText ? ocrText : "No Gemini response yet.";
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
  }, [tab, ocrLoading, ocrError, ocrText, geminiLoading, geminiError, geminiData, showOriginal, simplifyMoreText]);

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
    if (!ocrText) return;

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
          ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
        },
        body: JSON.stringify({
          text: ocrText,
          mode: mode ?? "Document",
          reading_level: level,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Gemini response failed (HTTP ${response.status})`);
      }

      const json: GeminiResponse = await response.json();

      setGeminiData(json);
      setSimplifyMoreText(json.simplification);
      setSimplifiedReadingLevel(json.reading_level ?? level);
      setSimplifiedMost((json.reading_level ?? level) === 1);
      try {
        setSessionReadingLevel(json.reading_level!!);
        setSimplifyMoreCount(0);
        await patchReadingLevel(level);
      }
      catch (e: any) {
        console.warn("Failed to store reading level:", e?.message ?? e);
      }
    } catch (e: any) {
      setGeminiError(e?.message ?? "Request failed");
    } finally {
      setGeminiLoading(false);
    }
  }

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
          onScrollBeginDrag={closeDefinitionModal}
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
              <Text style={styles.badgeText}>
                {badgeMode}
                {showLangLabel ? "\n\n" : ""}
                {showLangLabel ? (
                  <Text style={[styles.badgeText, { fontSize: 16, color: '#F2D3AC', fontWeight: '900' }]}>
                    {langLabel}
                  </Text>
                ) : null}
              </Text>
              <View style={styles.badgeNotch} />
            </View>

            {/* Inner "paper" */}
            <View style={styles.innerPaper}>
              {/* action items icon */}
              <Pressable
                style={[styles.actionItemBtn, {
                  backgroundColor: actionItemsDisabled ? 'transparent' : '#ECC8AF',
                  borderColor: actionItemsDisabled ? 'transparent' : 'rgba(0,0,0,0.5)'
                }]}
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
                  color={actionItemsDisabled ? 'transparent' : 'black'}
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                />
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
                onScrollBeginDrag={closeDefinitionModal}
              >
                <Text style={styles.bodyText}>
                  {tab === "Overview" && showOriginal
                    ? highlightedOriginal
                    : tab === "Easy Read"
                      ? highlightedSimplified
                      : content
                  }
                </Text>
              </ScrollView>

              {/* Bottom CTA */}
              {tab !== "Translate" && (
                <Pressable
                  style={[
                    styles.ctaBtn,
                    (ocrLoading || geminiLoading || !ocrText || simplifiedMost) &&
                    { backgroundColor: '#6C6767', opacity: 0.5 }
                  ]}
                  onPress={async () => {
                    if (tab === "Overview") {
                      setShowOriginal(!showOriginal)
                    }
                    else if (tab === "Easy Read") {
                      if (simplifiedMost || simplifiedReadingLevel === 1 || sessionReadingLevel === 1) {
                        return;
                      }
                      if (ocrLoading || geminiLoading || !ocrText) {
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
                            text: ocrText,
                            mode: mode ?? "Document",
                            simplify_more_by: simplifyMoreBy,
                            ...(sessionReadingLevel !== null ? { reading_level: sessionReadingLevel } : {}),
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
                  disabled={ocrLoading || geminiLoading || !ocrText
                    || (tab === "Easy Read" && (simplifiedMost || simplifiedReadingLevel === 1 || sessionReadingLevel === 1))}>
                  <Text style={styles.ctaText}>
                    {tab === "Easy Read" && simplifiedMost ? "Already Simplest"
                      : (tab === "Overview" && !showOriginal) ? "See Original Text"
                        : (tab === "Overview" && showOriginal) ? "See Simplified Text"
                          : (tab != "Overview") ? "Simplify More"
                            : "Simplify More"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>

        {tab === "Easy Read" && (
          <View style={styles.levelControlsWrap}>
            <DetailLevelTab
              label="Standard"
              hint="More detail"
              icon={<Ionicons name="book-outline" size={22} color="#1B1B1B" />}
              active={sessionReadingLevel === reading_levels.standard}
              onPress={() => rerunGeminiWithLevel(reading_levels.standard)}
            />

            <DetailLevelTab
              label="Simple"
              hint="Easier words"
              icon={<Ionicons name="reader-outline" size={22} color="#1B1B1B" />}
              active={sessionReadingLevel === reading_levels.simple}
              onPress={() => rerunGeminiWithLevel(reading_levels.simple)}
            />

            <DetailLevelTab
              label="Super"
              hint="Most simple"
              icon={<Ionicons name="sparkles-outline" size={22} color="#1B1B1B" />}
              active={sessionReadingLevel === reading_levels.super_simple}
              onPress={() => rerunGeminiWithLevel(reading_levels.super_simple)}
            />
          </View>
        )}
      </View>

      {/* Calibration Modal */}
      <Modal
        transparent
        visible={calibVis}
        animationType="fade"
        onRequestClose={closeCalibModal}
      >
        <View style={styles.calibBackground}>
          <Pressable style={styles.fullFill} onPress={closeCalibModal} />
          <View style={styles.calibCenter} pointerEvents='box-none'>
            <View style={styles.calibModalCard}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.calibBodyContent}
                showsVerticalScrollIndicator keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.calibTitle}>Calibrate Simplification</Text>

                {calibLoad ? (
                  <View style={styles.calibLoadRow}>
                    <ActivityIndicator size={22} color={"black"} />
                    <Text style={styles.calibLoadTxt}>Loading...</Text>
                  </View>
                ) : calibErr ? (
                  <Text style={styles.calibErrTxt}>{calibErr}</Text>
                ) : (
                  <View style={styles.calibOptsRow}>
                    <View style={styles.calibOpt}>
                      <View style={styles.calibOptHeader}>
                        <Text style={styles.calibOptHeaderTxt}> Option A - Lower</Text>
                      </View>
                      <Text style={styles.calibOptTxt}>{calibLowerTxt}</Text>
                    </View>

                    <View style={styles.calibOpt}>
                      <View style={styles.calibOptHeader}>
                        <Text style={styles.calibOptHeaderTxt}> Option B - Higher</Text>
                      </View>
                      <Text style={styles.calibOptTxt}>{calibHigherTxt}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.calibBtnRow}>
                  <Pressable
                    style={[styles.calibBtn, styles.calibBtnLow]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("lower");
                    }}
                  >
                    <Text style={styles.calibChoiceTxt}>Choose Option A</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.calibBtn, styles.calibBtnStay]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("stay");
                    }}
                  >
                    <Text style={styles.calibChoiceDarkTxt}>Neither - Don't change</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.calibBtn, styles.calibBtnHigh]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("higher");
                    }}
                  >
                    <Text style={styles.calibChoiceTxt}>Choose Option B</Text>
                  </Pressable>
                </View>
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
          style={styles.definitionBackground}
          onPress={closeDefinitionModal}
        >
          <Pressable
            style={styles.definitionModalCard}
            onPress={() => { }}
          >
            <Text style={styles.definitionModalWordText}>
              {definitionModal.word}
            </Text>
            <Text style={styles.definitionModalDefinitionText}>
              {definitionModal.definition}
            </Text>
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

function DetailLevelTab({
  label,
  hint,
  icon,
  active,
  onPress,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.levelTab,
        active ? styles.levelTabActive : styles.levelTabInactive,
      ]}
      hitSlop={8}
    >
      {icon}
      <Text
        style={[
          styles.levelTabText,
          active ? styles.levelTabText : styles.levelTabText,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.levelTabHint,
          active ? styles.levelTabHint : styles.levelTabHint,
        ]}
      >
        {hint}
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
  fullFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
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
  headerIconBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    marginRight: 8
  },
  headerIcon: { color: "white", fontSize: 36, marginTop: 8, marginLeft: 8 },
  headerTitle: { color: ACCENT, fontSize: 26, fontWeight: "700" },
  avatarBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "flex-end" },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  actionItemBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: 'center',
    borderRadius: 12,
    borderColor: 'rgba(0,0,0,0.5)',
    borderWidth: 0.5,
    shadowColor: 'black',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2
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
    marginTop: 15,
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
    fontWeight: "800",
    fontSize: 14,
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
    paddingHorizontal: 14,
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
    paddingVertical: 24,
    paddingHorizontal: 12,
    width: '100%'
  },
  bodyText: {
    color: "#1B1B1B",
    fontSize: 16.67,
    lineHeight: 24,
    fontWeight: "600",
    flexShrink: 1,
    flexWrap: 'wrap'
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

  complexWord: {
    color: '#8C311C',
    fontWeight: '800',
    textDecorationLine: 'underline'
  },

  definitionBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  definitionModalCard: {
    backgroundColor: PAPER,
    borderRadius: 16,
    padding: 16,
    borderWidth: 8,
    borderColor: CARD_BORDER,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    width: '100%',
    maxWidth: 340
  },
  definitionModalWordText: {
    fontWeight: '900',
    color: '#000000',
    marginBottom: 6
  },
  definitionModalDefinitionText: {
    fontWeight: '600',
    color: '#000000',
    lineHeight: 20
  },

  levelControlsWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: -25,
  },

  levelTab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#1B1B1B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1B1B1B",
  },

  levelTabActive: { backgroundColor: TAB_ACTIVE },
  levelTabInactive: { backgroundColor: TAB_INACTIVE },

  levelTabText: {
    marginTop: 4,
    fontWeight: "900",
    fontSize: 12,
    color: "#1B1B1B",
  },

  levelTabHint: {
    marginTop: 2,
    fontWeight: "700",
    fontSize: 10,
    color: "#1B1B1B",
  },

  calibBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  calibModalCard: {
    width: '100%',
    maxWidth: 420,
    height: Dimensions.get("window").height * 0.72,
    backgroundColor: PAPER,
    borderRadius: 18,
    borderWidth: 10,
    borderColor: CARD_BORDER,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: "hidden",
  },
  calibTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: "#1B1B1B",
    marginBottom: 4,
  },
  calibLoadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  calibLoadTxt: {
    fontWeight: "800",
    color: "#1B1B1B",
  },
  calibCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  calibBodyScroll: {
    flex: 1,
  },
  calibBodyContent: {
    padding: 14,
    flexGrow: 1,
  },
  calibErrTxt: {
    fontWeight: "800",
    color: "#8C311C",
    paddingVertical: 14,
  },
  calibOptsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  calibOpt: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.15)",
    backgroundColor: "rgba(0,0,0,0.03)",
    overflow: "hidden",
  },
  calibOptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  calibOptHeaderTxt: {
    fontWeight: "900",
    color: "#1B1B1B",
    fontSize: 12,
  },
  calibOptScroll: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  calibOptTxt: {
    fontWeight: "600",
    color: "#1B1B1B",
    lineHeight: 20,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  calibBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  calibBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  calibBtnLow: {
    backgroundColor: CTA,
  },
  calibBtnHigh: {
    backgroundColor: CTA,
  },
  calibBtnStay: {
    backgroundColor: TAB_INACTIVE,
    borderWidth: 1,
    borderColor: "#1B1B1B",
  },
  calibChoiceTxt: {
    color: "white",
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 14,
    flexWrap: "wrap",
  },
  calibChoiceDarkTxt: {
    color: "#1B1B1B",
    fontWeight: "900",
  }
});