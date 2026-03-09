interface ScoreRingProps {
  score: number;
  size?: number;
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--color-green)";
  if (score >= 60) return "var(--color-orange)";
  return "var(--color-red)";
}

function scoreBgColor(score: number): string {
  if (score >= 80) return "var(--color-green-light)";
  if (score >= 60) return "var(--color-orange-light)";
  return "var(--color-red-light)";
}

export function ScoreRing({ score, size = 48 }: ScoreRingProps) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);
  const color = scoreColor(score);
  const bgColor = scoreBgColor(score);
  const fontSize = size * 0.32;

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={bgColor}
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span
        className="score-ring-value"
        style={{ fontSize, color }}
      >
        {score}
      </span>
    </div>
  );
}
