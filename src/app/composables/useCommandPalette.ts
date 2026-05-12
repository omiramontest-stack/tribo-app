import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'

export interface CommandItem {
  id: string
  label: string
  sublabel?: string
  iconPath: string
  action: () => void
}

export interface CommandGroup {
  key: string
  label: string
  items: CommandItem[]
}

// Module-level singletons so any component can open/close the palette
const isOpen = ref(false)
const query  = ref('')

const ICON = {
  home:    '<path d="M3 11l9-8 9 8"/><path d="M5 9v12h14V9"/>',
  wallet:  '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
  qr:      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3M17 21h4"/>',
  users:   '<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="7" r="2.5"/><path d="M16 14c3.5 0 6 2.5 6 6"/>',
  chart:   '<path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>',
  flash:   '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  billing: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  plus:    '<path d="M12 5v14M5 12h14"/>',
  invite:  '<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
}

const WALLET_TYPE_LABEL: Record<string, string> = {
  stamps:     'Sellos',
  membership: 'Membresía',
  points:     'Puntos',
  cashback:   'Cashback',
  daypass:    'Pase diario',
  bundle:     'Bundle',
  giftcard:   'Gift card',
  coupon:     'Cupón',
}

export function useCommandPalette() {
  const router      = useRouter()
  const walletStore = useWalletStore()

  function navigate(name: string, params?: Record<string, string>) {
    router.push({ name, params })
    close()
  }

  function open()  { isOpen.value = true;  query.value = '' }
  function close() { isOpen.value = false; query.value = '' }

  // ── Static datasets ────────────────────────────────────────────────────────

  const PAGES: CommandItem[] = [
    { id: 'page-dashboard',  label: 'Dashboard',    sublabel: 'Vista general',          iconPath: ICON.home,    action: () => navigate('Dashboard')    },
    { id: 'page-wallets',    label: 'Wallets',       sublabel: 'Gestiona tus wallets',   iconPath: ICON.wallet,  action: () => navigate('Wallets')       },
    { id: 'page-scan',       label: 'Escanear QR',   sublabel: 'Validar pases',          iconPath: ICON.qr,      action: () => navigate('Scan')          },
    { id: 'page-team',       label: 'Equipo',        sublabel: 'Miembros de la org',     iconPath: ICON.users,   action: () => navigate('Team')          },
    { id: 'page-analytics',  label: 'Analítica',     sublabel: 'Estadísticas y métricas',iconPath: ICON.chart,   action: () => navigate('Analytics')     },
    { id: 'page-campaigns',  label: 'Campañas',      sublabel: 'Automatizaciones',       iconPath: ICON.flash,   action: () => navigate('Campaigns')     },
    { id: 'page-billing',    label: 'Facturación',   sublabel: 'Planes y pagos',         iconPath: ICON.billing, action: () => navigate('Billing')       },
  ]

  const ACTIONS: CommandItem[] = [
    { id: 'action-create-wallet', label: 'Nueva wallet',    sublabel: 'Crear una wallet nueva', iconPath: ICON.plus,   action: () => navigate('WalletCreate') },
    { id: 'action-invite',        label: 'Invitar miembro', sublabel: 'Añadir al equipo',       iconPath: ICON.invite, action: () => navigate('Team')         },
  ]

  // ── Filtering helpers ──────────────────────────────────────────────────────

  function hits(item: CommandItem): boolean {
    const q = query.value.toLowerCase()
    return item.label.toLowerCase().includes(q) || (item.sublabel ?? '').toLowerCase().includes(q)
  }

  // ── Computed groups ────────────────────────────────────────────────────────

  const groups = computed<CommandGroup[]>(() => {
    const q = query.value.trim()

    // Default view — no query
    if (!q) {
      return [
        { key: 'actions', label: 'Acciones rápidas', items: ACTIONS },
        { key: 'pages',   label: 'Páginas',           items: PAGES  },
      ]
    }

    const walletItems: CommandItem[] = walletStore.wallets
      .filter(w =>
        w.businessName.toLowerCase().includes(q.toLowerCase()) ||
        (WALLET_TYPE_LABEL[w.type] ?? '').toLowerCase().includes(q.toLowerCase()),
      )
      .map(w => ({
        id:       `wallet-${w.id}`,
        label:    w.businessName,
        sublabel: WALLET_TYPE_LABEL[w.type] ?? w.type,
        iconPath: ICON.wallet,
        action:   () => navigate('WalletDetail', { id: w.id }),
      }))

    const result: CommandGroup[] = []
    const filteredActions = ACTIONS.filter(hits)
    const filteredPages   = PAGES.filter(hits)

    if (filteredActions.length) result.push({ key: 'actions', label: 'Acciones',  items: filteredActions })
    if (filteredPages.length)   result.push({ key: 'pages',   label: 'Páginas',   items: filteredPages   })
    if (walletItems.length)     result.push({ key: 'wallets', label: 'Wallets',   items: walletItems     })

    return result
  })

  return { isOpen, query, groups, open, close }
}
