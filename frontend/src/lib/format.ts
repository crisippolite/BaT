/**
 * Format a number as a USD price string.
 * Example: 24500 → "$24,500"
 */
export function formatPrice(amount: number): string {
  return "$" + amount.toLocaleString("en-US");
}

/**
 * Format a Unix timestamp (ms) as a relative time-left string.
 * Examples: "2d 5h left", "3h left", "45m left", "Ended"
 */
export function formatTimeLeft(endTimeMs: number): string {
  const now = Date.now();
  const diff = endTimeMs - now;

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/**
 * Format a Unix timestamp (ms) as a short date string.
 * Example: "Apr 12, 2025"
 */
export function formatDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a Unix timestamp (ms) as date + time.
 * Example: "Apr 12, 2025 at 6:00 PM"
 */
export function formatDateTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
