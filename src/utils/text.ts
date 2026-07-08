export function upperCaseFirstLetterOfEachWord(string?: string) {
  if (!string) return ""
  return string
    .split(" ")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}
