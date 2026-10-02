/**
 * XP curve shared with the app. The API mirrors it in
 * services/api/app/progress/levels.py; change both together.
 * API request and response types come from the API's /openapi.json.
 */

export function xpForLevel(level: number): number {
  return 50 * level * level + 50 * level;
}

export function levelFromXp(totalXp: number): { level: number; intoLevel: number; span: number } {
  let level = 0;
  while (xpForLevel(level + 1) <= totalXp) level++;
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return { level, intoLevel: totalXp - floor, span: ceil - floor };
}
