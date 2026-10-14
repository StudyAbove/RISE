/**
 * Colors from the Calendar Figma frames that differ from the shared palette
 * (src/theme/colors.ts). The team rule: when a Figma color is in the same family
 * as a palette color, use the Figma value; otherwise use the palette color.
 * The comment on each value names the palette color it stands in for.
 */
export const calendarColors = {
  // eucalyptus family: selected switcher option and the circle around today's date
  selectedGreen: '#658370',
  // warmCream family: switcher background
  switcherBackground: '#E9E7E0',
  // mistGreen family: switcher outline and dividers
  hairline: '#CECECE',
  // mistGreen family: calendar grid lines
  gridLine: '#D9D4D4',
  // deepOlive family: month label and unselected switcher text
  labelText: '#353333',
  // deepOlive family: month grid dates, and day names and dates above the 2 Day / Day grid
  dateText: '#000000',
  // deepOlive family: dates above the Week grid
  weekHeaderNumber: '#1E1E1E',
  // mutedGrayGreen family: weekday letters and names (S M T…, SUN MON…)
  weekdayText: '#676767',
  // mutedGrayGreen family: "7 AM" hour labels
  hourLabel: '#5E5B5B',
} as const;
