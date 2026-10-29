/**
 * Canvas class names and codes often include the section, e.g.
 * "CECS 491B SEC 01" or "ENGL 100-02". Students only need the class, so
 * RISE leaves the section out everywhere it shows a class.
 */

// "SEC 01", "Sec01", "Sec. 2", "Section 05", "SEC 01/02", "(SEC 03)",
// with any separator in front of it. Needs a number after "Sec", so words
// like "Secure" or "Section Leader Training" are left alone.
const SECTION_PATTERN =
  /\s*[-–,:/]?\s*\(?\bsec(?:tion)?\.?\s*[-#]?\s*\d[0-9a-z]{0,3}(?:\s*[/,&]\s*\d[0-9a-z]{0,3})*\)?/gi;

// A section number on the end of a class code, e.g. "ENGL 100-02".
const CODE_SECTION_SUFFIX = /\s*-\s*\d{1,3}$/;

function tidy(text: string) {
  return text
    .replace(/\s{2,}/g, ' ')
    // "BIOL 200 : Cell Biology" → "BIOL 200: Cell Biology"
    .replace(/\s+([:,])/g, '$1')
    .replace(/^[\s\-–,:/]+|[\s\-–,:/]+$/g, '')
    .trim();
}

/** "CECS 491B SEC 01 Senior Project" → "CECS 491B Senior Project". */
export function removeCourseSection(name: string): string {
  const cleaned = tidy(name.replace(SECTION_PATTERN, ' '));

  // Keep the original if cleaning would leave nothing.
  return cleaned || name.trim();
}

/** "CECS 491B-01" or "CECS 491B SEC 01" → "CECS 491B". */
export function removeCourseCodeSection(code: string): string {
  const cleaned = tidy(removeCourseSection(code).replace(CODE_SECTION_SUFFIX, ''));

  return cleaned || code.trim();
}
