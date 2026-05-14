<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useCommandPalette, type CommandItem } from '@/app/composables/useCommandPalette'

const { isOpen, query, groups, open, close } = useCommandPalette()

const inputRef    = ref<HTMLInputElement | null>(null)
const listRef     = ref<HTMLElement | null>(null)
const focusedIndex = ref(0)

const flatItems = computed<CommandItem[]>(() => groups.value.flatMap(g => g.items))
const hasResults = computed(() => flatItems.value.length > 0)

// Auto-focus input when palette opens; reset state on close
watch(isOpen, async (val) => {
  if (val) {
    focusedIndex.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

// Reset focus to first item whenever results change
watch(groups, () => { focusedIndex.value = 0 })

// ── Global shortcuts ──────────────────────────────────────────────────────────
useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    isOpen.value ? close() : open()
    return
  }
  if (!isOpen.value) return

  if (e.key === 'Escape')    { e.preventDefault(); close(); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1);  return }
  if (e.key === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return }
  if (e.key === 'Enter')     { e.preventDefault(); runFocused();  return }
})

function moveFocus(dir: 1 | -1) {
  const total = flatItems.value.length
  if (!total) return
  focusedIndex.value = (focusedIndex.value + dir + total) % total
  nextTick(() => {
    const el = listRef.value?.querySelector<HTMLElement>(`[data-idx="${focusedIndex.value}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function runFocused() {
  flatItems.value[focusedIndex.value]?.action()
}

function getGlobalIndex(item: CommandItem): number {
  return flatItems.value.findIndex(i => i.id === item.id)
}

// ── Text highlight ────────────────────────────────────────────────────────────
function highlight(text: string): Array<{ text: string; match: boolean }> {
  const q = query.value.trim()
  if (!q) return [{ text, match: false }]
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return [{ text, match: false }]
  return [
    { text: text.slice(0, idx),           match: false },
    { text: text.slice(idx, idx + q.length), match: true  },
    { text: text.slice(idx + q.length),   match: false },
  ].filter(s => s.text.length > 0)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="isOpen"
        class="cp-overlay"
        @mousedown.self="close"
      >
        <Transition name="modal" appear>
          <div class="cp-modal">

            <!-- Search input -->
            <div class="cp-input-row">
              <svg class="cp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
              </svg>
              <input
                ref="inputRef"
                v-model="query"
                class="cp-input"
                placeholder="Buscar páginas, acciones, wallets…"
                autocomplete="off"
                spellcheck="false"
              />
              <kbd class="cp-esc-key" @click="close">esc</kbd>
            </div>

            <!-- Results -->
            <div ref="listRef" class="cp-results">

              <!-- Groups -->
              <template v-if="hasResults">
                <div v-for="group in groups" :key="group.key" class="cp-group">
                  <p class="cp-group-label">{{ group.label }}</p>

                  <button
                    v-for="item in group.items"
                    :key="item.id"
                    :data-idx="getGlobalIndex(item)"
                    class="cp-item"
                    :class="{ 'cp-item--focused': focusedIndex === getGlobalIndex(item) }"
                    @mouseenter="focusedIndex = getGlobalIndex(item)"
                    @click="item.action()"
                  >
                    <!-- Icon -->
                    <span class="cp-item__icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="item.iconPath" />
                    </span>

                    <!-- Text -->
                    <span class="cp-item__text">
                      <span class="cp-item__label">
                        <template v-for="(seg, i) in highlight(item.label)" :key="i">
                          <mark v-if="seg.match" class="cp-mark">{{ seg.text }}</mark>
                          <template v-else>{{ seg.text }}</template>
                        </template>
                      </span>
                      <span v-if="item.sublabel" class="cp-item__sublabel">
                        <template v-for="(seg, i) in highlight(item.sublabel)" :key="i">
                          <mark v-if="seg.match" class="cp-mark cp-mark--sub">{{ seg.text }}</mark>
                          <template v-else>{{ seg.text }}</template>
                        </template>
                      </span>
                    </span>

                    <!-- Enter hint when focused -->
                    <kbd v-if="focusedIndex === getGlobalIndex(item)" class="cp-item__enter">↵</kbd>
                  </button>
                </div>
              </template>

              <!-- Empty state -->
              <div v-else class="cp-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
                </svg>
                <p class="cp-empty__title">Sin resultados para "<strong>{{ query }}</strong>"</p>
                <p class="cp-empty__sub">Intenta con otro término</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="cp-footer">
              <span class="cp-footer__hint"><kbd>↑↓</kbd> navegar</span>
              <span class="cp-footer__hint"><kbd>↵</kbd> abrir</span>
              <span class="cp-footer__hint"><kbd>esc</kbd> cerrar</span>
              <span class="cp-footer__spacer" />
              <span class="cp-footer__shortcut"><kbd>⌘K</kbd></span>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ── */
.cp-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  backdrop-filter: blur(4px);
  z-index: 9000;
  display: grid;
  place-items: start center;
  padding-top: 12vh;
}

/* ── Modal ── */
.cp-modal {
  width: 100%;
  max-width: 580px;
  background: var(--bg-surface);
  border-radius: 18px;
  border: 1px solid var(--border);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}

/* ── Input ── */
.cp-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--bg-subtle);
  flex-shrink: 0;
}

.cp-input-icon {
  color: var(--text-nav-icon);
  flex-shrink: 0;
}

.cp-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-ink);
  background: transparent;
  font-family: inherit;
}

.cp-input::placeholder {
  color: var(--text-faint);
  font-weight: 400;
}

.cp-esc-key {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-nav-icon);
  background: var(--bg-page);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 2px 6px;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
  user-select: none;
}

/* ── Results ── */
.cp-results {
  overflow-y: auto;
  flex: 1;
  padding: 8px 0;
}

/* ── Group ── */
.cp-group {
  padding: 0 8px;
  margin-bottom: 4px;
}

.cp-group-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: var(--text-nav-icon);
  text-transform: uppercase;
  padding: 8px 10px 4px;
}

/* ── Item ── */
.cp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 9px 10px;
  border-radius: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.2s ease;
}

.cp-item--focused {
  background: var(--bg-green);
}

.cp-item__icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg-page);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--text-medium);
  transition: background 0.25s ease, color 0.25s ease;
}

.cp-item--focused .cp-item__icon {
  background: var(--primary-mid);
  color: var(--bg-surface);
}

.cp-item__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cp-item__label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-ink);
  line-height: 1.3;
}

.cp-item__sublabel {
  font-size: 12px;
  color: var(--text-nav-icon);
  line-height: 1.3;
}

.cp-item__enter {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-nav-icon);
  background: var(--bg-green);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 2px 6px;
  font-family: inherit;
  flex-shrink: 0;
}

/* ── Highlight mark ── */
.cp-mark {
  background: transparent;
  color: var(--amber);
  font-weight: 700;
}

.cp-mark--sub {
  color: var(--warning);
}

/* ── Empty state ── */
.cp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 20px;
  text-align: center;
}

.cp-empty__title {
  font-size: 14px;
  color: var(--text-medium);
  font-weight: 500;
}

.cp-empty__sub {
  font-size: 12.5px;
  color: var(--text-faint);
}

/* ── Footer ── */
.cp-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  border-top: 1px solid var(--bg-subtle);
  background: var(--bg-page);
  flex-shrink: 0;
}

.cp-footer__hint {
  font-size: 11px;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  gap: 4px;
}

.cp-footer__hint kbd,
.cp-footer__shortcut kbd {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  font-family: inherit;
}

.cp-footer__spacer { flex: 1; }

.cp-footer__shortcut {
  font-size: 11px;
  color: var(--text-faint);
}

/* ── Transitions ── */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.18s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-8px);
}
</style>
