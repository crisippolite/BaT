import { formatTimeLeft } from "../lib/format";

interface TimeLeftProps {
  endTime: number | null | undefined;
}

export function TimeLeft({ endTime }: TimeLeftProps) {
  if (!endTime) return null;

  const hoursRemaining = (endTime - Date.now()) / (1000 * 60 * 60);
  const text = formatTimeLeft(endTime);

  let urgencyClass = "";
  if (hoursRemaining <= 0) urgencyClass = "";
  else if (hoursRemaining < 6) urgencyClass = "urgent";
  else if (hoursRemaining < 24) urgencyClass = "soon";

  if (hoursRemaining <= 0) {
    return <span className="time-left">Ended</span>;
  }

  return <span className={`time-left ${urgencyClass}`}>{text}</span>;
}
