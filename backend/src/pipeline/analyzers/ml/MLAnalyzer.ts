/**
 * Extract username from log
 */
function extractUsername(log: any): string | null {
  // FIX: Read from the new nested context mapping
  return log.metadata?.actor?.username || null;
}