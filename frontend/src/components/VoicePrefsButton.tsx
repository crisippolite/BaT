import { useState, useRef, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import toast from "react-hot-toast";

interface VoicePrefsButtonProps {
  onPrefsGenerated: (prefs: Record<string, any>) => void;
}

export function VoicePrefsButton({ onPrefsGenerated }: VoicePrefsButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const parseVoice = useAction(api.voicePrefs.parseVoiceToPrefs);

  // Check for browser speech recognition support
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let fullTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          fullTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(fullTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech") {
        toast.error(`Speech error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setTranscript("");
  }, [SpeechRecognition]);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const processTranscript = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        toast.error("No speech detected. Try again.");
        return;
      }

      setIsProcessing(true);
      try {
        const result = await parseVoice({ transcript: text.trim() });
        const { summary, ...prefs } = result;

        onPrefsGenerated(prefs);
        toast.success(summary || "Preferences configured from your description!");
        setTranscript(null);
      } catch (err: any) {
        console.error("Parse error:", err);
        toast.error("Failed to parse description. Try again or adjust manually.");
      } finally {
        setIsProcessing(false);
      }
    },
    [parseVoice, onPrefsGenerated]
  );

  return (
    <div className="prefs-section" style={{ background: "var(--color-surface-alt, var(--color-surface))" }}>
      <h2 className="prefs-section-title">Describe Your Dream Car</h2>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-sec)",
          marginBottom: "var(--space-4)",
        }}
      >
        Click the microphone and describe your ideal BMW 2002. We'll configure
        your preferences automatically.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {/* Record / Stop button */}
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              border: isRecording ? "2px solid #ef4444" : "2px solid var(--color-border)",
              background: isRecording ? "rgba(239, 68, 68, 0.1)" : "var(--color-surface)",
              color: isRecording ? "#ef4444" : "var(--color-text)",
              fontWeight: 600,
              cursor: isProcessing ? "not-allowed" : "pointer",
              fontSize: "var(--text-sm)",
              transition: "all 0.2s",
            }}
          >
            {isRecording ? (
              <>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#ef4444",
                    animation: "pulse 1.5s infinite",
                  }}
                />
                Stop Recording
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                {isProcessing ? "Processing..." : "Record Dream Car"}
              </>
            )}
          </button>

          {transcript && !isRecording && !isProcessing && (
            <button
              onClick={() => processTranscript(transcript)}
              style={{
                padding: "10px 20px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--color-orange)",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              Configure Preferences
            </button>
          )}
        </div>

        {/* Live transcript */}
        {(isRecording || transcript) && (
          <div
            style={{
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-sec)",
              minHeight: 60,
              fontStyle: transcript ? "normal" : "italic",
            }}
          >
            {transcript || "Listening... describe your dream BMW 2002"}
          </div>
        )}

        {/* Or type it */}
        {!isRecording && !transcript && (
          <TextInput onSubmit={processTranscript} disabled={isProcessing} />
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// Fallback text input for browsers without speech recognition
function TextInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");

  return (
    <div style={{ display: "flex", gap: "var(--space-2)" }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g. "I want a rust-free tii with A/C, 5-speed, and track suspension under $50k"'
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) onSubmit(text.trim());
        }}
        style={{
          flex: 1,
          padding: "8px 12px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          fontSize: "var(--text-sm)",
        }}
      />
      <button
        onClick={() => text.trim() && onSubmit(text.trim())}
        disabled={disabled || !text.trim()}
        style={{
          padding: "8px 16px",
          borderRadius: "var(--radius-md)",
          border: "none",
          background: text.trim() ? "var(--color-orange)" : "var(--color-border)",
          color: "white",
          fontWeight: 600,
          cursor: text.trim() && !disabled ? "pointer" : "not-allowed",
          fontSize: "var(--text-sm)",
        }}
      >
        Go
      </button>
    </div>
  );
}
