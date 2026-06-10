import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { ReadingSettingsValue } from "../components/ReadingSettings";

export const DEFAULT_READING_SETTINGS: ReadingSettingsValue = {
  font_preference: "OpenDyslexic",
  font_size: 18,
  overlay_color: "#FFF3CD",
  ruler_enabled: true,
};

export function useReadingSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReadingSettingsValue>(DEFAULT_READING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/students/me/settings", {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (!res.ok) throw new Error("Não consegui carregar seus ajustes.");

        const data = (await res.json()) as ReadingSettingsValue;
        if (active) setSettings(data);
      } catch (err) {
        if (active) {
          setSettings(DEFAULT_READING_SETTINGS);
          setError(err instanceof Error ? err.message : "Não consegui carregar seus ajustes.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, [user]);

  async function saveSettings() {
    if (!user) return false;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/students/me/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Não consegui salvar seus ajustes.");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não consegui salvar seus ajustes.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { settings, setSettings, saveSettings, loading, saving, error };
}
