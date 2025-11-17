import { Allergy } from '@prisma/client';

const allergyLookup = new Map<string, Allergy>(
  Object.values(Allergy).map((value) => [value.toUpperCase(), value]),
);

function normalizeAllergyValue(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
}

export function normalizeAllergies(values: string[]): Allergy[] {
  const normalized = new Set<Allergy>();

  for (const value of values) {
    const formatted = normalizeAllergyValue(value);
    const match = allergyLookup.get(formatted);

    if (match) {
      normalized.add(match);
    }
  }

  return [...normalized];
}
