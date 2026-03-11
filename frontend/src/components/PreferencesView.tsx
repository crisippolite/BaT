import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Toggle } from "./Toggle";
import { SignInBanner } from "./AuthButtons";
import { VoicePrefsButton } from "./VoicePrefsButton";
import toast from "react-hot-toast";

const BONUS_FEATURES = [
  // Engine
  { key: "s14_swap", label: "S14 Engine Swap (E30 M3)", category: "Engine" },
  { key: "m42_swap", label: "M42 / F20C Engine Swap", category: "Engine" },
  // Transmission
  { key: "has_5_speed", label: "5-Speed Getrag Conversion", category: "Transmission" },
  { key: "rebuilt_transmission", label: "Rebuilt Trans / New Clutch", category: "Transmission" },
  { key: "custom_shifter", label: "Custom Shifter Linkage", category: "Transmission" },
  // Exterior
  { key: "widebody", label: "Gruppe 2 Widebody / Turbo Flares", category: "Exterior" },
  { key: "ducktail_spoiler", label: "Ducktail Rear Spoiler", category: "Exterior" },
  { key: "front_air_dam", label: "Front Air Dam", category: "Exterior" },
  { key: "round_taillights", label: "Round Rear Taillights", category: "Exterior" },
  // Wheels
  { key: "lightweight_wheels", label: "Lightweight / Period-Correct Wheels", category: "Wheels" },
  // Interior
  { key: "has_ac", label: "Working Air Conditioning", category: "Interior" },
  { key: "recaro_seats", label: "Recaro / Scheel Rally Sport Seats", category: "Interior" },
  // Mechanical
  { key: "track_suspension", label: "Track Suspension (Koni / Bilstein)", category: "Mechanical" },
];

// Group features by category
const featuresByCategory = BONUS_FEATURES.reduce(
  (acc, feat) => {
    if (!acc[feat.category]) acc[feat.category] = [];
    acc[feat.category].push(feat);
    return acc;
  },
  {} as Record<string, typeof BONUS_FEATURES>
);

export function PreferencesView() {
  const defaults = useQuery(api.preferences.getDefaults);
  const savedPrefs = useQuery(api.preferences.get);
  const savePrefs = useMutation(api.preferences.save);

  const [prefs, setPrefs] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (savedPrefs?.prefsJson) {
      setPrefs(savedPrefs.prefsJson);
    } else {
      const saved = localStorage.getItem("bat-signal-prefs");
      if (saved) {
        try {
          setPrefs(JSON.parse(saved));
        } catch {
          // fall through
        }
      }
    }
  }, [savedPrefs]);

  const currentPrefs = prefs ?? defaults ?? {
    passFailCriteria: { noStructuralRust: true, pre1976: true, cleanTitle: true },
    bonusWeights: {},
    alerts: { newMatch: true, reserveRisk: true, lastHour: true, highSnipeRisk: false },
  };

  const updatePrefs = (updater: (prev: typeof currentPrefs) => typeof currentPrefs) => {
    const updated = updater(currentPrefs);
    setPrefs(updated);
    localStorage.setItem("bat-signal-prefs", JSON.stringify(updated));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("bat-signal-token") ?? undefined;
      await savePrefs({ token, prefsJson: currentPrefs });
      toast.success("Preferences saved");
    } catch (err) {
      toast.error("Failed to save preferences");
    }
  };

  const handleVoicePrefs = (generatedPrefs: Record<string, any>) => {
    const merged = {
      ...currentPrefs,
      ...generatedPrefs,
      passFailCriteria: {
        ...currentPrefs.passFailCriteria,
        ...generatedPrefs.passFailCriteria,
      },
      bonusWeights: {
        ...currentPrefs.bonusWeights,
        ...generatedPrefs.bonusWeights,
      },
      alerts: {
        ...currentPrefs.alerts,
        ...generatedPrefs.alerts,
      },
      searchProfile: generatedPrefs.searchProfile ?? currentPrefs.searchProfile,
    };
    setPrefs(merged);
    localStorage.setItem("bat-signal-prefs", JSON.stringify(merged));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h1 className="page-title" style={{ margin: 0 }}>Preferences</h1>
        <button
          onClick={handleSave}
          style={{
            background: "var(--color-orange)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "8px 20px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>

      <SignInBanner />

      {/* Voice-to-Preferences */}
      <VoicePrefsButton onPrefsGenerated={handleVoicePrefs} />

      {/* Pass/Fail Criteria */}
      <div className="prefs-section">
        <h2 className="prefs-section-title">Pass / Fail Criteria</h2>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)", marginBottom: "var(--space-4)" }}>
          Auctions failing these are disqualified. No structural rust, pre-1976 only, clean title required.
        </p>

        <div className="prefs-row">
          <div>
            <div className="prefs-label">No Structural Rust</div>
            <div className="prefs-description">Reject moderate/heavy rust or poor repairs</div>
          </div>
          <Toggle
            enabled={currentPrefs.passFailCriteria?.noStructuralRust ?? true}
            onToggle={() =>
              updatePrefs((p) => ({
                ...p,
                passFailCriteria: { ...p.passFailCriteria, noStructuralRust: !p.passFailCriteria?.noStructuralRust },
              }))
            }
          />
        </div>

        <div className="prefs-row">
          <div>
            <div className="prefs-label">Pre-1976 Only</div>
            <div className="prefs-description">Only pre-1976 model year vehicles</div>
          </div>
          <Toggle
            enabled={currentPrefs.passFailCriteria?.pre1976 ?? true}
            onToggle={() =>
              updatePrefs((p) => ({
                ...p,
                passFailCriteria: { ...p.passFailCriteria, pre1976: !p.passFailCriteria?.pre1976 },
              }))
            }
          />
        </div>

        <div className="prefs-row">
          <div>
            <div className="prefs-label">Clean Title</div>
            <div className="prefs-description">Require clean title, no questionable swaps</div>
          </div>
          <Toggle
            enabled={currentPrefs.passFailCriteria?.cleanTitle ?? true}
            onToggle={() =>
              updatePrefs((p) => ({
                ...p,
                passFailCriteria: { ...p.passFailCriteria, cleanTitle: !p.passFailCriteria?.cleanTitle },
              }))
            }
          />
        </div>
      </div>

      {/* Bonus Weights — grouped by category */}
      <div className="prefs-section">
        <h2 className="prefs-section-title">Bonus Feature Weights</h2>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)", marginBottom: "var(--space-4)" }}>
          Assign point values to features you care about (0–10). Higher = more important to your ideal build.
        </p>

        {Object.entries(featuresByCategory).map(([category, features]) => (
          <div key={category}>
            <div
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-text-muted)",
                padding: "var(--space-3) 0 var(--space-1)",
                marginTop: "var(--space-2)",
              }}
            >
              {category}
            </div>
            {features.map((feat) => (
              <div key={feat.key} className="prefs-row">
                <span className="prefs-label">{feat.label}</span>
                <input
                  type="number"
                  className="weight-input"
                  min={0}
                  max={10}
                  value={currentPrefs.bonusWeights?.[feat.key] ?? 0}
                  onChange={(e) =>
                    updatePrefs((p) => ({
                      ...p,
                      bonusWeights: {
                        ...p.bonusWeights,
                        [feat.key]: parseInt(e.target.value, 10) || 0,
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Search Profile */}
      {currentPrefs.searchProfile && (
        <div className="prefs-section">
          <h2 className="prefs-section-title">Search Profile</h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)", marginBottom: "var(--space-4)" }}>
            Filter auctions by year range, budget, and keywords.
          </p>

          <div className="prefs-row">
            <span className="prefs-label">Year Range</span>
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <input
                type="number"
                className="weight-input"
                style={{ width: 70 }}
                value={currentPrefs.searchProfile.yearMin ?? 1966}
                onChange={(e) =>
                  updatePrefs((p) => ({
                    ...p,
                    searchProfile: { ...p.searchProfile, yearMin: parseInt(e.target.value, 10) || 1966 },
                  }))
                }
              />
              <span style={{ color: "var(--color-text-muted)" }}>–</span>
              <input
                type="number"
                className="weight-input"
                style={{ width: 70 }}
                value={currentPrefs.searchProfile.yearMax ?? 1975}
                onChange={(e) =>
                  updatePrefs((p) => ({
                    ...p,
                    searchProfile: { ...p.searchProfile, yearMax: parseInt(e.target.value, 10) || 1975 },
                  }))
                }
              />
            </div>
          </div>

          <div className="prefs-row">
            <span className="prefs-label">Max Price</span>
            <input
              type="number"
              className="weight-input"
              style={{ width: 90 }}
              value={currentPrefs.searchProfile.priceMax ?? 50000}
              onChange={(e) =>
                updatePrefs((p) => ({
                  ...p,
                  searchProfile: { ...p.searchProfile, priceMax: parseInt(e.target.value, 10) || 50000 },
                }))
              }
            />
          </div>

          <div className="prefs-row">
            <span className="prefs-label">Keywords</span>
            <input
              type="text"
              value={(currentPrefs.searchProfile.keywords ?? []).join(", ")}
              onChange={(e) =>
                updatePrefs((p) => ({
                  ...p,
                  searchProfile: {
                    ...p.searchProfile,
                    keywords: e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean),
                  },
                }))
              }
              placeholder="tii, 5-speed, rust-free"
              style={{
                width: 200,
                padding: "5px 8px",
                borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--color-border)",
                fontSize: "var(--text-sm)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
              }}
            />
          </div>
        </div>
      )}

      {/* Alert Settings */}
      <div className="prefs-section">
        <h2 className="prefs-section-title">Alert Settings</h2>

        <div className="prefs-row">
          <div>
            <div className="prefs-label">New Matching Auction</div>
            <div className="prefs-description">Alert when a new BMW 2002 is listed</div>
          </div>
          <Toggle
            enabled={currentPrefs.alerts?.newMatch ?? true}
            onToggle={() =>
              updatePrefs((p) => ({ ...p, alerts: { ...p.alerts, newMatch: !p.alerts?.newMatch } }))
            }
          />
        </div>

        <div className="prefs-row">
          <div>
            <div className="prefs-label">Reserve at Risk</div>
            <div className="prefs-description">Alert when a watched auction may not meet reserve</div>
          </div>
          <Toggle
            enabled={currentPrefs.alerts?.reserveRisk ?? true}
            onToggle={() =>
              updatePrefs((p) => ({ ...p, alerts: { ...p.alerts, reserveRisk: !p.alerts?.reserveRisk } }))
            }
          />
        </div>

        <div className="prefs-row">
          <div>
            <div className="prefs-label">Entering Final Hour</div>
            <div className="prefs-description">Alert when a watched auction enters its last hour</div>
          </div>
          <Toggle
            enabled={currentPrefs.alerts?.lastHour ?? true}
            onToggle={() =>
              updatePrefs((p) => ({ ...p, alerts: { ...p.alerts, lastHour: !p.alerts?.lastHour } }))
            }
          />
        </div>

        <div className="prefs-row">
          <div>
            <div className="prefs-label">High Snipe Risk</div>
            <div className="prefs-description">Alert when snipe probability exceeds 85%</div>
          </div>
          <Toggle
            enabled={currentPrefs.alerts?.highSnipeRisk ?? false}
            onToggle={() =>
              updatePrefs((p) => ({ ...p, alerts: { ...p.alerts, highSnipeRisk: !p.alerts?.highSnipeRisk } }))
            }
          />
        </div>
      </div>
    </div>
  );
}
