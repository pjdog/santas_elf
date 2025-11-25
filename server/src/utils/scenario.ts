/**
 * Normalize scenario names to a safe, consistent key for storage.
 * Examples:
 *   "Christmas Party" -> "christmas-party"
 *   "  thanksgiving " -> "thanksgiving"
 */
export const sanitizeScenario = (raw?: string): string => {
  if (!raw) return 'default';
  const cleaned = raw.toString().trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return cleaned || 'default';
};

export default sanitizeScenario;
