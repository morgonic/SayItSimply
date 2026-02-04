import { Directory, File, Paths } from "expo-file-system";
import storage from "./storage";

export type CaptureMode = 
  | "Sign"
  | "Auto-detect"
  | "Menu"
  | "Form"
  | "Label"
  | "Receipt"
  | "Document"
  | "Medical"
  | "Instructions"
  | "Article"
  | "Book"
  | "Board";

export type CaptureSource = "camera" | "gallery";

export type CaptureItem = {
  id: string;
  uri: string;
  mode: CaptureMode;
  source: CaptureSource;
  createdAt: string;
};

const CAPTURES_KEY = "sayitsimply_captures_v1";

const capDir = new Directory(Paths.document, "captures");


function inferExt(uri: string) {
  const match = uri.match(/\.(jpg|jpeg|png|heic|webp)(\?|$)/i);
  return (match?.[1] ?? "jpg").toLowerCase();
}

function verifyDir() {
    capDir.create({ intermediates: true, idempotent: true });
}

export async function getCaptures(): Promise<CaptureItem[]> {
  const raw = await storage.getItem(CAPTURES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CaptureItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveCaptures(list: CaptureItem[]) {
  await storage.setItem(CAPTURES_KEY, JSON.stringify(list));
}

export async function addCapture(params: {
  tempUri: string;
  mode: CaptureMode;
  source: CaptureSource;
}): Promise<CaptureItem> {
  verifyDir();

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ext = inferExt(params.tempUri);
  const src = new File(params.tempUri);
  const dest = new File(capDir, `${id}.${ext}`);

  src.copy(dest);

  const item: CaptureItem = {
    id,
    uri: dest.uri,
    mode: params.mode,
    source: params.source,
    createdAt: new Date().toISOString(),
  };

  const existing = await getCaptures();
  const updated = [item, ...existing];
  await saveCaptures(updated);

  return item;
}

export async function delCapture(id: string): Promise<void> {
  const existing = await getCaptures();
  const target = existing.find((c) => c.id === id);
  const updated = existing.filter((c) => c.id !== id);
  await saveCaptures(updated);

  if (target?.uri) {
    try {
        new File(target.uri).delete();
    } catch {

    }
  }
}

export async function clearCaptures(): Promise<void> {
  const existing = await getCaptures();
  await storage.deleteItem(CAPTURES_KEY);

  for (const item of existing) {
    try {
        new File(item.uri).delete();
    } catch {

    }
  }
}

export default storage;