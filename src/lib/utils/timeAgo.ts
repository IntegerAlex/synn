/**
 * Format a date string as a relative time string (e.g., "5m ago", "2h ago", "3d ago").
 */
export function timeAgo(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();

	if (Number.isNaN(then)) return dateStr || "unknown";

	const diff = now - then;

	if (diff < 0) return "just now";

	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}
