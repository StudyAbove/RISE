/**
 * Colors students can give their classes. Each class's color marks its
 * assignments everywhere in RISE (List, Calendar, Home).
 *
 * The database stores the key (e.g. "coral"), so the shades can be tuned
 * here without migrating data. Keep this list in sync with
 * extension/content/courseColors.js and the check on courses.color.
 */
export const COURSE_COLORS = {
  sunbeam: { name: 'Sunbeam', color: '#F5C84C', tint: '#FFF4D1' },
  apricot: { name: 'Apricot', color: '#F6A96C', tint: '#FFE9D8' },
  coral: { name: 'Coral', color: '#F28B82', tint: '#FDE3E0' },
  blush: { name: 'Blush', color: '#EE9CB8', tint: '#FCE4EC' },
  lilac: { name: 'Lilac', color: '#B9A2E8', tint: '#EEE7FB' },
  periwinkle: { name: 'Periwinkle', color: '#8FA8F0', tint: '#E3E9FC' },
  sky: { name: 'Sky', color: '#7EC4EA', tint: '#DFF1FA' },
  aqua: { name: 'Aqua', color: '#6CCDC4', tint: '#DBF4F1' },
  mint: { name: 'Mint', color: '#86D3A4', tint: '#E0F5E8' },
  sage: { name: 'Sage', color: '#A8BEA3', tint: '#EAF0E8' },
  pistachio: { name: 'Pistachio', color: '#C3D97A', tint: '#F1F7DC' },
  sand: { name: 'Sand', color: '#D9B99B', tint: '#F5ECE3' },
} as const;

export type CourseColorKey = keyof typeof COURSE_COLORS;

export const COURSE_COLOR_KEYS = Object.keys(COURSE_COLORS) as CourseColorKey[];

/** Shades for a saved color key, falling back to Sage for unknown or missing keys. */
export function getCourseColor(key: string | null | undefined) {
  return COURSE_COLORS[key as CourseColorKey] ?? COURSE_COLORS.sage;
}
