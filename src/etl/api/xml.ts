export type XmlItem = Record<string, string>

export function parseXmlItems(xml: string): XmlItem[] {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  return itemMatches.map((match) => parseXmlFields(match[1]))
}

export function parseXmlRows(xml: string): XmlItem[] {
  const rowMatches = [...xml.matchAll(/<row>([\s\S]*?)<\/row>/g)]
  return rowMatches.map((match) => parseXmlFields(match[1]))
}

export function parseSeoulXmlResult(xml: string) {
  return parseXmlFields(xml.match(/<RESULT>([\s\S]*?)<\/RESULT>/)?.[1] ?? '')
}

export function parseXmlHeader(xml: string) {
  return parseXmlFields(xml.match(/<header>([\s\S]*?)<\/header>/)?.[1] ?? '')
}

function parseXmlFields(xml: string): XmlItem {
  const fields: XmlItem = {}
  const matches = xml.matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g)

  for (const match of matches) {
    fields[match[1]] = decodeXml(match[2].trim())
  }

  return fields
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
