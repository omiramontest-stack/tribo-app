import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

export function useOrgWallets() {
  const walletStore = useWalletStore()
  const orgStore = useOrganizationStore()
  const { activeOrgId } = storeToRefs(orgStore)
  const fetching = ref(false)

  watch(
    activeOrgId,
    async (id) => {
      if (!id) return
      walletStore.clearWallets()
      fetching.value = true
      try {
        await walletStore.fetchWallets()
      } finally {
        fetching.value = false
      }
    },
    { immediate: true },
  )

  return { fetching }
}
