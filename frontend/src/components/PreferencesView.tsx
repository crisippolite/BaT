import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Toggle } from "./Toggle";
import { SignInBanner } from "./AuthButtons";
import toast from "react-hot-toast";

const BONUS_FEATURES = [
  { key: "has_ac", label: "Working Air Conditioning" },
  { key: "has_5_speed", label: "5-Speed Getrag Conversion" },
  { key: "s14_swap", label: "S14 Engine Swap" },
  { key: "widebody", label: "Widebody / Flares" },
  { key: "m42_swap", label: "M42 Engine Swap" },
  { key: "recaro_seats", label: "Recaro Seats" },
  { key: "track_suspension", label: "Track Suspension" },
  { key: "lightweight_wheels", label: "Lightweight Wheels" },
];

export function PreferencesView() {
  const defaults = useQuery(api.preferences.getDefaults);
  const savedPrefs = useQuery(api.preferences.get);
  const savePrefs = useMutation(api.preferences.save);

  const [prefs, setPrefs] = useState<Record<string, any> | null>(null);

  // Load prefs: prefer server-saved (authenticated), then localStorage, then defaults
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

  // Use defaults until prefs are loaded
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
      await savePrefs({
        token,
        prefsJson: currentPrefs,
      });
      toast.success("Preferences saved");
    } catch (err) {
      toast.error("Failed to save preferences");
    }
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

      {/* Pass/Fail Criteria */}
      <div className="prefs-section">
        <h2 className="prefs-section-title">Pass / Fail Criteria</h2>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)", marginBottom: "var(--space-4)" }}>
          Auctions failing these criteria will be scored 0 and flagged.
        </p>

        <div className="prefs-row">
          <div>
            <div className="prefs-label">No Structural Rust</div>
            <div className="prefs-description">Reject auctions with moderate or heavy rust</div>
          </div>
          <Toggle
            enabled={currentPrefs.passFailCriteria?.noStructuralRust ?? true}
            onToggle={() =>
              updatePrefs((p) => ({
                ...p,
                passFailCriteria: {
                  ...p.passFailCriteria,
                  noStructuralRust: !p.passFailCriteria?.noStructuralRust,
                },
              }))
            }
          />
        </div>

        <div className="prefs-row">
          <div>
            <div className="prefs-label">Pre-1976 Only</div>
            <div className="prefs-description">Only show pre-1976 models</div>
          </div>
          <Toggle
            enabled={currentPrefs.passFailCriteria?.pre1976 ?? true}
            onToggle={() =>
              updatePrefs((p) => ({
                ...p,
                passFailCriteria: {
                  ...p.passFailCriteria,
                  pre1976: !p.passFailCriteria?.pre1976,
                },
              }))
            }
          />
        </div>

        <div className="prefs-row">
          <div>
            <div className="prefs-label">Clean Title</div>
            <div className="prefs-description">Require clean title status</div>
          </div>
          <Toggle
            enabled={currentPrefs.passFailCriteria?.cleanTitle ?? true}
            onToggle={() =>
              updatePrefs((p) => ({
                ...p,
                passFailCriteria: {
                  ...p.passFailCriteria,
                  cleanTitle: !p.passFailCriteria?.cleanTitle,
                },
              }))
            }
          />
        </div>
      </div>

      {/* Bonus Weights */}
      <div className="prefs-section">
        <h2 className="prefs-section-title">Bonus Feature Weights</h2>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)", marginBottom: "var(--space-4)" }}>
          Assign point values to features you care about (0–10).
        </p>

        {BONUS_FEATURES.map((feat) => (
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
              updatePrefs((p) => ({
                ...p,
                alerts: { ...p.alerts, newMatch: !p.alerts?.newMatch },
              }))
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
              updatePrefs((p) => ({
                ...p,
                alerts: { ...p.alerts, reserveRisk: !p.alerts?.reserveRisk },
              }))
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
              updatePrefs((p) => ({
                ...p,
                alerts: { ...p.alerts, lastHour: !p.alerts?.lastHour },
              }))
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
              updatePrefs((p) => ({
                ...p,
                alerts: {
                  ...p.alerts,
                  highSnipeRisk: !p.alerts?.highSnipeRisk,
                },
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}
