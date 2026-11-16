const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Every query word may match any field, in any order, including partial names.
export function matchesSearch(query: string, fields: string[]): boolean {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const text = fields.map(normalize).join(" ");
  return words.every((word) => text.includes(word));
}
