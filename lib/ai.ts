import type { NormalizedQuery } from '@/types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 3_000;

const SYSTEM_PROMPT = `You are an automotive parts query parser for Brazilian mechanics. Extract structured data from search queries written in Portuguese or English.

Return ONLY valid JSON. Do not explain. Do not add commentary.

Output schema:
{
  "year": number | null,
  "make": string | null,
  "model": string | null,
  "part": string,
  "synonyms": string[],
  "confidence": "high" | "medium" | "low"
}

Rules:
- If year is ambiguous, return null
- Normalize part names to standard Brazilian Portuguese automotive terminology (e.g. "pastilha de freio", "amortecedor", "alternador", "vela de ignição")
- Understand Brazilian slang: "buzina" (horn), "retrovisor" (mirror), "coxim" (engine mount), "tensor" (tensioner), "bengala" (CV axle)
- Recognize Brazilian-market models: Onix, HB20, Gol, Uno, Sandero, Kwid, Argo, Mobi, Compass, Tracker, T-Cross
- Never invent make/model combinations that do not exist
- If the query is not automotive-related, return { "error": "non_automotive" }`;

function buildUserPrompt(query: string): string {
  return `Query: """${query}"""`;
}

function validateResponse(raw: unknown): NormalizedQuery | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if ('error' in r) return null;

  if (typeof r.part !== 'string' || r.part.trim() === '') return null;

  const year = r.year === null ? null : Number(r.year);
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1)) return null;

  const confidence = r.confidence;
  if (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') return null;

  return {
    year,
    make: typeof r.make === 'string' ? r.make : null,
    model: typeof r.model === 'string' ? r.model : null,
    part: r.part.trim(),
    synonyms: Array.isArray(r.synonyms) ? r.synonyms.filter((s) => typeof s === 'string') : [],
    confidence,
  };
}

const KNOWN_MAKES = [
  // Global
  'Acura','Alfa Romeo','Audi','BMW','Buick','Cadillac','Chevrolet','Chevy',
  'Chrysler','Dodge','Ferrari','Fiat','Ford','GMC','Genesis','Honda','Hyundai',
  'Infiniti','Jaguar','Jeep','Kia','Lamborghini','Land Rover','Lexus','Lincoln',
  'Maserati','Mazda','Mercedes','Mercedes-Benz','Mini','Mitsubishi','Nissan',
  'Porsche','Ram','Rivian','Rolls-Royce','Subaru','Tesla','Toyota','Volkswagen',
  'VW','Volvo',
  // Brazilian market
  'Caoa Chery','Chery','Citroën','Citroen','Effa','GWM','Haval','Peugeot',
  'Renault','Renegade','Toro','Tracker',
];

// Longest-first so "Mercedes-Benz" matches before "Mercedes"
const MAKES_RE = new RegExp(
  `\\b(${KNOWN_MAKES.sort((a, b) => b.length - a.length)
    .map((m) => m.replace(/[-]/g, '[-]'))
    .join('|')})\\b`,
  'i'
);

function keywordFallback(query: string): NormalizedQuery {
  const yearMatch = query.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

  const makeMatch = query.match(MAKES_RE);
  const make = makeMatch ? makeMatch[0] : null;

  let remainder = query
    .replace(/\b(19|20)\d{2}\b/, '')
    .replace(MAKES_RE, '')
    .trim();

  // First word of remainder is likely the model (e.g. "F150", "Camry", "Civic")
  const modelMatch = remainder.match(/^([\w-]+)/);
  const model = modelMatch ? modelMatch[1] : null;
  const part = model ? remainder.replace(model, '').trim() : remainder;

  return {
    year,
    make,
    model,
    part: part || query,
    synonyms: [],
    confidence: 'low',
  };
}

export async function normalizeQuery(query: string): Promise<NormalizedQuery> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return keywordFallback(query);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        temperature: 0.1,
        max_tokens: 256,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(query) },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) return keywordFallback(query);

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return keywordFallback(query);

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const parsed = JSON.parse(jsonStr.trim());
    return validateResponse(parsed) ?? keywordFallback(query);
  } catch {
    return keywordFallback(query);
  }
}
