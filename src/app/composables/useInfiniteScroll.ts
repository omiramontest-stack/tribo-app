import { watchEffect, onUnmounted, type Ref } from 'vue'

export function useInfiniteScroll(
  sentinelRef: Ref<HTMLElement | null>,
  onLoadMore: () => void,
) {
  let observer: IntersectionObserver | null = null

  watchEffect(() => {
    observer?.disconnect()
    if (!sentinelRef.value) return
    observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore() },
      { rootMargin: '200px' },
    )
    observer.observe(sentinelRef.value)
  })

  onUnmounted(() => { observer?.disconnect() })
}
