// ViewBox is mapped perfectly to overlay standard Brazil path datasets.
export const BRAZIL_VIEW_BOX = '0 0 1000 1000'

// A stylized cartogram / simplified hex-like path set representing the geography of Brazil states.
// This ensures performance, scalability, and absolute perfection inside standard dashboards without massive SVGs.
const buildHex = (cx: number, cy: number, r: number) => {
  const h = (r * Math.sqrt(3)) / 2
  return `M ${cx - r} ${cy} L ${cx - r / 2} ${cy - h} L ${cx + r / 2} ${cy - h} L ${cx + r} ${cy} L ${cx + r / 2} ${cy + h} L ${cx - r / 2} ${cy + h} Z`
}

// Base positions mapping the rough geographic topology of Brazil (HexCartogram Style)
const radius = 48
const ox = 280
const oy = 250
const dx = radius * 1.5
const dy = radius * Math.sqrt(3)

export const BRAZIL_STATES: Record<string, string> = {
  // North
  RR: buildHex(ox + dx * 2, oy + dy * 0, radius),
  AP: buildHex(ox + dx * 3, oy + dy * 0, radius),
  AM: buildHex(ox + dx * 1, oy + dy * 1, radius),
  PA: buildHex(ox + dx * 2.5, oy + dy * 1, radius),
  AC: buildHex(ox + dx * 0, oy + dy * 2, radius),
  RO: buildHex(ox + dx * 1.5, oy + dy * 2, radius),
  TO: buildHex(ox + dx * 3.5, oy + dy * 2, radius),
  // Northeast
  MA: buildHex(ox + dx * 4, oy + dy * 1, radius),
  CE: buildHex(ox + dx * 5, oy + dy * 1, radius),
  RN: buildHex(ox + dx * 6, oy + dy * 1, radius),
  PI: buildHex(ox + dx * 4.5, oy + dy * 2, radius),
  PB: buildHex(ox + dx * 6.5, oy + dy * 2, radius),
  PE: buildHex(ox + dx * 7, oy + dy * 3, radius),
  AL: buildHex(ox + dx * 6.5, oy + dy * 4, radius),
  SE: buildHex(ox + dx * 6, oy + dy * 5, radius),
  BA: buildHex(ox + dx * 5, oy + dy * 4, radius),
  // Center-West
  MT: buildHex(ox + dx * 2, oy + dy * 3, radius),
  GO: buildHex(ox + dx * 3.5, oy + dy * 3, radius),
  DF: buildHex(ox + dx * 4, oy + dy * 3, radius), // slightly overlapping, kept distinct for hex
  MS: buildHex(ox + dx * 2.5, oy + dy * 4, radius),
  // Southeast
  MG: buildHex(ox + dx * 4.5, oy + dy * 5, radius),
  ES: buildHex(ox + dx * 5.5, oy + dy * 6, radius),
  RJ: buildHex(ox + dx * 4.5, oy + dy * 7, radius),
  SP: buildHex(ox + dx * 3.5, oy + dy * 6, radius),
  // South
  PR: buildHex(ox + dx * 3, oy + dy * 7, radius),
  SC: buildHex(ox + dx * 3.5, oy + dy * 8, radius),
  RS: buildHex(ox + dx * 3, oy + dy * 9, radius),
}
