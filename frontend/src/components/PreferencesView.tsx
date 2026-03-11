import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Toggle } from "./Toggle";
import { SignInBanner } from "./AuthButtons";
import { VoicePrefsButton } from "./VoicePrefsButton";
import toast from "react-hot-toast";

const BONUS_FEATURES = [
  { key: "s14_swap", label: "S14 Engine Swap (E30 M3)", category: "Engine" },
  { key: "m42_swap", label: "M42 / F20C Engine Swap", category: "Engine" },
  { key: "has_5_speed", label: "5-Speed Getrag Conversion", category: "Transmission" },
  { key: "rebuilt_transmission", label: "Rebuilt Trans / New Clutch", category: "Transmission" },
  { key: "custom_shifter", label: "Custom Shifter Linkage", category: "Transmission" },
  { key: "widebody", label: "Gruppe 2 Widebody / Turbo Flares", category: "Exterior" },
  { key: "ducktail_spoiler", label: "Ducktail Rear Spoiler", category: "Exterior" },
  { key: "front_air_dam", label: "Front Air Dam", category: "Exterior" },
  { key: "round_taillights", label: "Round Rear Taillights", category: "Exterior" },
  { key: "lightweight_wheels", label: "Lightweight / Period-Correct Wheels", category: "Wheels" },
  { key: "has_ac", label: "Working Air Conditioning", category: "Interior" },
  { key: "recaro_seats", label: "Recaro / Scheel Rally Sport Seats", category: "Interior" },
  { key: "track_suspension", label: "Track Suspension (Koni / Bilstein)", category: "Mechanical" },
];

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
  const profiles = useQuery(api.preferences.listProfiles);
  const savedPrefs = useQuery(api.preferences.get);
  const savePrefs = useMutation(api.preferences.save);
  const createProfile = useMutation(api.preferences.createProfile);
  const setActiveProfile = useMutation(api.preferences.setActiveProfile);
  const deleteProfile = useMutation(api.preferences.deleteProfile);
  const renameProfile = useMutation(api.preferences.renameProfile);

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<string, any> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  // Sync active profile from server
  useEffect(() => {
    if (savedPrefs) {
      setActiveProfileId(savedPrefs._id);
      setPrefs(savedPrefs.prefsJson);
    } else {
      const saved = localStorage.getItem("bat-signal-prefs");
      if (saved) {
        try { setPrefs(JSON.parse(saved)); } catch { /* fall through */ }
      }
    }
  }, [savedPrefs]);

  // When switching profiles, load that profile's prefs
  useEffect(() => {
    if (activeProfileId && profiles) {
      const profile = profiles.find((p: any) => p._id === activeProfileId);
      if (profile) {
        setPrefs(profile.prefsJson);
      }
    }
  }, [activeProfileId, profiles]);

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
        profileId: activeProfileId as any,
        token,
        prefsJson: currentPrefs,
      });
      toast.success("Profile saved");
    } catch (err) {
      toast.error("Failed to save");
    }
  };

  const handleCreateProfile = async () => {
    const name = newProfileName.trim();
    if (!name) return;
    try {
      const result = await createProfile({
        name,
        prefsJson: defaults ?? currentPrefs,
        setActive: true,
      });
      setActiveProfileId(result.id);
      setNewProfileName("");
      setIsCreating(false);
      toast.success(`Created "${name}"`);
    } catch (err) {
      toast.error("Failed to create profile");
    }
  };

  const handleSwitchProfile = async (profileId: string) => {
    try {
      await setActiveProfile({ profileId: profileId as any });
      setActiveProfileId(profileId);
      toast.success("Switched profile");
    } catch (err) {
      toast.error("Failed to switch");
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      await deleteProfile({ profileId: profileId as any });
      toast.success("Profile deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleRename = async (profileId: string) => {
    const name = editNameValue.trim();
    if (!name) return;
    try {
      await renameProfile({ profileId: profileId as any, name });
      setEditingName(null);
      toast.success("Renamed");
    } catch (err) {
      toast.error("Failed to rename");
    }
  };

  const handleVoicePrefs = (generatedPrefs: Record<string, any>) => {
    const merged = {
      ...currentPrefs,
      ...generatedPrefs,
      passFailCriteria: { ...currentPrefs.passFailCriteria, ...generatedPrefs.passFailCriteria },
      bonusWeights: { ...currentPrefs.bonusWeights, ...generatedPrefs.bonusWeights },
      alerts: { ...currentPrefs.alerts, ...generatedPrefs.alerts },
      searchProfile: generatedPrefs.searchProfile ?? currentPrefs.searchProfile,
    };
    setPrefs(merged);
    localStorage.setItem("bat-signal-prefs", JSON.stringify(merged));
  };

  const hasMultipleProfiles = profiles && profiles.length > 0;

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

      {/* Watch Profiles */}
      {hasMultipleProfiles && (
        <div className="prefs-section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
            <h2 className="prefs-section-title" style={{ margin: 0 }}>Watch Profiles</h2>
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                style={{
                  background: "none",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "5px 12px",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--color-text-sec)",
                  cursor: "pointer",
                }}
              >
                + New Profile
              </button>
            )}
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)", marginBottom: "var(--space-4)" }}>
            Create different watch configurations for different builds you're looking for.
          </p>

          {/* Profile list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {profiles!.map((profile: any) => (
              <div
                key={profile._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: profile._id === activeProfileId
                    ? "1.5px solid var(--color-orange)"
                    : "1.5px solid var(--color-border)",
                  background: profile._id === activeProfileId
                    ? "var(--color-orange-light)"
                    : "var(--color-surface)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onClick={() => {
                  if (profile._id !== activeProfileId) {
                    handleSwitchProfile(profile._id);
                  }
                }}
              >
                {/* Active indicator */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: profile.isDefault ? "var(--color-orange)" : "var(--color-border)",
                    flexShrink: 0,
                  }}
                />

                {/* Name (editable) */}
                {editingName === profile._id ? (
                  <input
                    autoFocus
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onBlur={() => handleRename(profile._id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(profile._id);
                      if (e.key === "Escape") setEditingName(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--color-orange)",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--color-text)",
                      outline: "none",
                      padding: "2px 0",
                    }}
                  />
                ) : (
                  <span
                    style={{ flex: 1, fontSize: "var(--text-sm)", fontWeight: 600 }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingName(profile._id);
                      setEditNameValue(profile.name);
                    }}
                  >
                    {profile.name}
                  </span>
                )}

                {/* Active badge */}
                {profile.isDefault && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--color-orange)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Active
                  </span>
                )}

                {/* Delete button (not for last profile) */}
                {profiles!.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProfile(profile._id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      fontSize: "16px",
                      lineHeight: 1,
                      padding: "2px 4px",
                    }}
                    title="Delete profile"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* New profile form */}
          {isCreating && (
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <input
                autoFocus
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProfile();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                placeholder='e.g. "Track Build" or "Clean Stock tii"'
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid var(--color-border)",
                  fontSize: "var(--text-sm)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                }}
              />
              <button
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim()}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: newProfileName.trim() ? "var(--color-orange)" : "var(--color-border)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  cursor: newProfileName.trim() ? "pointer" : "not-allowed",
                }}
              >
                Create
              </button>
              <button
                onClick={() => { setIsCreating(false); setNewProfileName(""); }}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  background: "none",
                  color: "var(--color-text-sec)",
                  fontSize: "var(--text-sm)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create first additional profile prompt (when user only has 1 or is anonymous) */}
      {(!hasMultipleProfiles || profiles?.length === 1) && !isCreating && (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            marginBottom: "var(--space-5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", marginBottom: 2 }}>
              Watching for multiple builds?
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)" }}>
              Create separate watch profiles — one for a clean stock tii, another for a track build, etc.
            </div>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            style={{
              background: "none",
              border: "1.5px solid var(--color-orange)",
              borderRadius: "var(--radius-md)",
              padding: "6px 14px",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--color-orange)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + New Profile
          </button>
        </div>
      )}

      {/* Inline new profile form when no profile section is showing */}
      {isCreating && (!hasMultipleProfiles || profiles?.length === 1) && (
        <div className="prefs-section">
          <h2 className="prefs-section-title">New Watch Profile</h2>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              autoFocus
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProfile();
                if (e.key === "Escape") { setIsCreating(false); setNewProfileName(""); }
              }}
              placeholder='e.g. "Track Build" or "Clean Stock tii"'
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--color-border)",
                fontSize: "var(--text-sm)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
              }}
            />
            <button
              onClick={handleCreateProfile}
              disabled={!newProfileName.trim()}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: newProfileName.trim() ? "var(--color-orange)" : "var(--color-border)",
                color: "white",
                fontWeight: 600,
                cursor: newProfileName.trim() ? "pointer" : "not-allowed",
              }}
            >
              Create
            </button>
            <button
              onClick={() => { setIsCreating(false); setNewProfileName(""); }}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "none",
                color: "var(--color-text-sec)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
