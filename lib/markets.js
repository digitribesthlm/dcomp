export const MARKETS = [
  { code: 'SE', language: 'sv', googleDomain: 'google.se', label: 'Sweden' },
  { code: 'NO', language: 'no', googleDomain: 'google.no', label: 'Norway' },
  { code: 'FI', language: 'fi', googleDomain: 'google.fi', label: 'Finland' },
  { code: 'DK', language: 'da', googleDomain: 'google.dk', label: 'Denmark' },
  { code: 'DE', language: 'de', googleDomain: 'google.de', label: 'Germany' },
  { code: 'FR', language: 'fr', googleDomain: 'google.fr', label: 'France' },
  { code: 'IT', language: 'it', googleDomain: 'google.it', label: 'Italy' },
  { code: 'ES', language: 'es', googleDomain: 'google.es', label: 'Spain' },
  { code: 'NL', language: 'nl', googleDomain: 'google.nl', label: 'Netherlands' },
  { code: 'PL', language: 'pl', googleDomain: 'google.pl', label: 'Poland' },
  { code: 'GB', language: 'en', googleDomain: 'google.co.uk', label: 'United Kingdom' },
  { code: 'US', language: 'en', googleDomain: 'google.com', label: 'United States' },
]

export const MARKET_CODES = MARKETS.map(m => m.code)

export function getMarket(code) {
  return MARKETS.find(m => m.code === code.toUpperCase())
}
