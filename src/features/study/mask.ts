/**
 * "Preservation" -> "P···········". An initial and a length is the difference between
 * a blank wall and a word on the tip of your tongue, and it is still recall — you
 * have to produce the item, not recognise it. Grading stays order-independent, so a
 * hint is a nudge, not a slot you are locked into.
 *
 * Shared by the study session's hint pass and the set preview's card front, so the
 * two never drift into showing a different shape for the same item.
 */
export function mask(item: string): string {
  return item
    .split(" ")
    .map((word, i) =>
      i === 0
        ? word.slice(0, 1) + "·".repeat(Math.max(0, word.length - 1))
        : "·".repeat(word.length)
    )
    .join(" ");
}
