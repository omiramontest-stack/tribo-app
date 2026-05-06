import { ref } from 'vue'

export type PlanGateCode = 'SUBSCRIPTION_REQUIRED' | 'PLAN_UPGRADE_REQUIRED' | 'WALLET_LIMIT_REACHED' | 'PASS_LIMIT_REACHED'

interface PlanGateEvent {
  code: PlanGateCode
  message: string
}

const event = ref<PlanGateEvent | null>(null)

export function usePlanGate() {
  function trigger(code: PlanGateCode, message: string) {
    event.value = { code, message }
  }

  function dismiss() {
    event.value = null
  }

  return { event, trigger, dismiss }
}
