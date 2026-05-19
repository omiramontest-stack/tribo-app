export interface StampIconDef {
  id: string
  label: string
  svg: string
}

export const STAMP_ICONS: StampIconDef[] = [
  {
    id: 'check',
    label: 'Check',
    svg: `<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  {
    id: 'star',
    label: 'Estrella',
    svg: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="currentColor" stroke-width="0.5"/>`,
  },
  {
    id: 'heart',
    label: 'Corazón',
    svg: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" stroke="currentColor" stroke-width="0.5"/>`,
  },
  {
    id: 'coffee',
    label: 'Café',
    svg: `<path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    id: 'pizza',
    label: 'Pizza',
    svg: `<path d="M12 2L2 22h20L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="12" cy="13" r="1.5" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>`,
  },
  {
    id: 'beer',
    label: 'Cerveza',
    svg: `<path d="M5 3h13l-2 16H7L5 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  {
    id: 'bolt',
    label: 'Rayo',
    svg: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>`,
  },
  {
    id: 'fire',
    label: 'Fuego',
    svg: `<path d="M12 22c-4.4 0-8-3.6-8-8 0-4.5 3.7-7.7 5-9 .3 2.7 2.1 4.5 3.8 5.7-.3-2.7 1-5.5 2.2-6.7.9 2 1.9 4 2 6.5 1.5-1.2 1.7-2.9 1.7-4.3C21.4 11 20 17.5 12 22z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  {
    id: 'crown',
    label: 'Corona',
    svg: `<path d="M2 18h20l-3-12-5 6.5L12 3l-2 9.5L5 6 2 18z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="2" y1="21" x2="22" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    id: 'paw',
    label: 'Huella',
    svg: `<circle cx="6.5" cy="7" r="2" fill="currentColor"/><circle cx="17.5" cy="7" r="2" fill="currentColor"/><circle cx="4" cy="12.5" r="1.5" fill="currentColor"/><circle cx="20" cy="12.5" r="1.5" fill="currentColor"/><path d="M12 10c-3.5 0-6 2.5-6 5.5 0 2.5 2.5 4.5 6 4.5s6-2 6-4.5C18 12.5 15.5 10 12 10z" fill="currentColor"/>`,
  },
]

export const STAMP_ICONS_MAP = Object.fromEntries(STAMP_ICONS.map(i => [i.id, i]))

export function getStampIcon(id = 'check'): StampIconDef {
  return STAMP_ICONS_MAP[id] ?? STAMP_ICONS_MAP['check']
}
