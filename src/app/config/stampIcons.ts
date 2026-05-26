export interface StampIconDef {
  id: string
  label: string
  svg: string
  category: 'general' | 'alimentos' | 'mascotas' | 'custom'
}

export const STAMP_ICONS: StampIconDef[] = [
  // ── General ──────────────────────────────────────────────────────────
  {
    id: 'check',
    label: 'Check',
    category: 'general',
    svg: `<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  {
    id: 'star',
    label: 'Estrella',
    category: 'general',
    svg: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="currentColor" stroke-width="0.5"/>`,
  },
  {
    id: 'heart',
    label: 'Corazón',
    category: 'general',
    svg: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" stroke="currentColor" stroke-width="0.5"/>`,
  },
  {
    id: 'bolt',
    label: 'Rayo',
    category: 'general',
    svg: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>`,
  },
  {
    id: 'fire',
    label: 'Fuego',
    category: 'general',
    svg: `<path d="M12 22c-4.4 0-8-3.6-8-8 0-4.5 3.7-7.7 5-9 .3 2.7 2.1 4.5 3.8 5.7-.3-2.7 1-5.5 2.2-6.7.9 2 1.9 4 2 6.5 1.5-1.2 1.7-2.9 1.7-4.3C21.4 11 20 17.5 12 22z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  {
    id: 'crown',
    label: 'Corona',
    category: 'general',
    svg: `<path d="M2 18h20l-3-12-5 6.5L12 3l-2 9.5L5 6 2 18z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="2" y1="21" x2="22" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    id: 'gem',
    label: 'Gema',
    category: 'general',
    svg: `<path d="M6 3h12l4 6-10 12L2 9 6 3z" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/><path d="M2 9h20M6 3l6 6M18 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.35" fill="none"/>`,
  },
  {
    id: 'gift',
    label: 'Regalo',
    category: 'general',
    svg: `<rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M3 12h18M12 8v13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 8C12 5.5 9.5 4 8.5 5S8 8 12 8z" fill="currentColor"/><path d="M12 8c0-2.5 2.5-4 3.5-3s.5 3-3.5 3z" fill="currentColor"/>`,
  },
  {
    id: 'music',
    label: 'Música',
    category: 'general',
    svg: `<path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="18" cy="16" r="3" fill="currentColor"/>`,
  },
  {
    id: 'leaf',
    label: 'Hoja',
    category: 'general',
    svg: `<path d="M17 8C8 10 5.9 16.17 3.82 19.34a1 1 0 0 0 1.41 1.41C8.59 18.9 14.9 17.5 17 8z" fill="currentColor"/><path d="M4 20l7-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  {
    id: 'flower',
    label: 'Flor',
    category: 'general',
    svg: `<circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="4" r="2.5" fill="currentColor" opacity="0.65"/><circle cx="12" cy="20" r="2.5" fill="currentColor" opacity="0.65"/><circle cx="4" cy="12" r="2.5" fill="currentColor" opacity="0.65"/><circle cx="20" cy="12" r="2.5" fill="currentColor" opacity="0.65"/><circle cx="6.3" cy="6.3" r="2" fill="currentColor" opacity="0.4"/><circle cx="17.7" cy="6.3" r="2" fill="currentColor" opacity="0.4"/><circle cx="6.3" cy="17.7" r="2" fill="currentColor" opacity="0.4"/><circle cx="17.7" cy="17.7" r="2" fill="currentColor" opacity="0.4"/>`,
  },

  // ── Mascotas ─────────────────────────────────────────────────────────
  {
    id: 'paw',
    label: 'Huella',
    category: 'mascotas',
    svg: `<circle cx="6.5" cy="7" r="2" fill="currentColor"/><circle cx="17.5" cy="7" r="2" fill="currentColor"/><circle cx="4" cy="12.5" r="1.5" fill="currentColor"/><circle cx="20" cy="12.5" r="1.5" fill="currentColor"/><path d="M12 10c-3.5 0-6 2.5-6 5.5 0 2.5 2.5 4.5 6 4.5s6-2 6-4.5C18 12.5 15.5 10 12 10z" fill="currentColor"/>`,
  },

  // ── Alimentos ─────────────────────────────────────────────────────────
  {
    id: 'coffee',
    label: 'Café',
    category: 'alimentos',
    svg: `<path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    id: 'pizza',
    label: 'Pizza',
    category: 'alimentos',
    svg: `<path d="M12 2L2 22h20L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="12" cy="13" r="1.5" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>`,
  },
  {
    id: 'beer',
    label: 'Cerveza',
    category: 'alimentos',
    svg: `<path d="M5 3h13l-2 16H7L5 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  {
    id: 'burger',
    label: 'Hamburguesa',
    category: 'alimentos',
    svg: `<path d="M4 12C4 8.69 7.58 6 12 6s8 2.69 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><rect x="3" y="12" width="18" height="2.5" rx="1.25" fill="currentColor"/><rect x="3" y="16" width="18" height="2.5" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  },
  {
    id: 'icecream',
    label: 'Helado',
    category: 'alimentos',
    svg: `<path d="M7 11l5 11 5-11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M7 11a5 5 0 0 1 10 0H7z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,
  },

  // ── Custom ────────────────────────────────────────────────────────────
  {
    id: 'custom',
    label: 'Personalizado',
    category: 'custom',
    svg: `<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><polyline points="21 15 16 10 5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
]

export const STAMP_ICONS_MAP = Object.fromEntries(STAMP_ICONS.map(i => [i.id, i]))

/** Devuelve las categorías presentes en la lista, en orden definido. */
export const STAMP_ICON_CATEGORY_ORDER = ['general', 'mascotas', 'alimentos', 'custom'] as const
export type StampIconCategory = (typeof STAMP_ICON_CATEGORY_ORDER)[number]

export const STAMP_ICON_CATEGORY_LABELS: Record<StampIconCategory, string> = {
  general: 'General',
  mascotas: 'Mascotas',
  alimentos: 'Alimentos',
  custom: 'Personalizado',
}

/** Íconos agrupados por categoría (solo categorías con al menos un ícono). */
export function groupedStampIcons(): Array<{ category: StampIconCategory; icons: StampIconDef[] }> {
  return STAMP_ICON_CATEGORY_ORDER.map(cat => ({
    category: cat,
    icons: STAMP_ICONS.filter(i => i.category === cat),
  })).filter(g => g.icons.length > 0)
}

export function getStampIcon(id = 'check'): StampIconDef {
  return STAMP_ICONS_MAP[id] ?? STAMP_ICONS_MAP['check']
}
