export function formatMillimeters(value: number) {
  return `${Math.round(value * 10) / 10} mm`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function getRandomId(prefix: string) {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${suffix}`
}
