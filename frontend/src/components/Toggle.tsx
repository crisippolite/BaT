interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function Toggle({ enabled, onToggle }: ToggleProps) {
  return (
    <button
      className={`toggle-track ${enabled ? "on" : ""}`}
      onClick={onToggle}
      aria-label={enabled ? "Disable" : "Enable"}
    >
      <div className="toggle-thumb" />
    </button>
  );
}
