/** Splits "Track - Artist" into [track, artist | null]. Shared by the PDF export and the live game display. */
export function splitSongTitle(title: string): [string, string | null] {
  const separatorIndex = title.indexOf(' - ');
  if (separatorIndex === -1) return [title, null];
  return [title.slice(0, separatorIndex), title.slice(separatorIndex + 3)];
}
