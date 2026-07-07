import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { ReadingSettingsValue } from "../components/ReadingSettings";

export const DEFAULT_READING_SETTINGS: ReadingSettingsValue = {
  font_preference: "OpenDyslexic",
  font_size: 18,
  overlay_color: "#FFF3CD",
  ruler_enabled: false,
  line_height: 1.8,
  letter_spacing: 0.5,
  high_contrast: false,
};

const LOCAL_SETTINGS_KEY = "dilexy_reading_settings";

function storageKey(username?: string | null): string {
  return username ? `${LOCAL_SETTINGS_KEY}:${username}` : LOCAL_SETTINGS_KEY;
}

function readFromStorage(username?: string | null): ReadingSettingsValue {
  try {
    const raw = localStorage.getItem(storageKey(username));
    if (!raw) return DEFAULT_READING_SETTINGS;
    return { ...DEFAULT_READING_SETTINGS, ...(JSON.parse(raw) as Partial<ReadingSettingsValue>) };
  } catch {
    return DEFAULT_READING_SETTINGS;
  }
}

function writeToStorage(settings: ReadingSettingsValue, username?: string | null): void {
  localStorage.setItem(storageKey(username), JSON.stringify(settings));
}

export function useReadingSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReadingSettingsValue>(() => readFromStorage(user?.username));
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    setSaving(true);
    writeToStorage(settings, user?.username);
    setSaving(false);
    return true;
  }

  return { settings, setSettings, saveSettings, loading: false, saving, error: "" };
}
