<script setup lang="ts">
import { GitCommitHorizontal, Clock, ChevronUp, ChevronDown, FilePlus, FileEdit, Trash2, ArrowUpDown } from 'lucide-vue-next'

const props = defineProps<{ presentationId: string }>()

interface ChangeEntry {
  action: string
  description: string
  slide_hash: string
  created_at: string
}

const expanded = ref(false)
const changes = ref<ChangeEntry[]>([])

const { data, refresh } = useFetch<ChangeEntry[]>(`/api/presentations/${props.presentationId}/changes`)

watch(data, (val) => { if (val) changes.value = val }, { immediate: true })

// Poll every 5 seconds for updates
const pollInterval = ref<ReturnType<typeof setInterval>>()
onMounted(() => {
  pollInterval.value = setInterval(() => refresh(), 5000)
})
onUnmounted(() => {
  if (pollInterval.value) clearInterval(pollInterval.value)
})

const actionIcon = (action: string) => {
  switch (action) {
    case 'add': return FilePlus
    case 'edit': return FileEdit
    case 'delete': return Trash2
    case 'reorder': return ArrowUpDown
    default: return GitCommitHorizontal
  }
}

const actionColor = (action: string) => {
  switch (action) {
    case 'add': return '#3fb950'
    case 'edit': return '#d29922'
    case 'delete': return '#f85149'
    case 'reorder': return '#58a6ff'
    default: return '#8b949e'
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr + 'Z')
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 10) return 'agora'
  if (seconds < 60) return `${seconds}s atrás`
  if (minutes < 60) return `${minutes}min atrás`
  if (hours < 24) return `${hours}h atrás`
  return `${days}d atrás`
}

const lastChange = computed(() => changes.value[0] || null)
const visibleChanges = computed(() => changes.value.slice(0, 3))
</script>

<template>
  <div class="changelog">
    <div class="changelog-bar" @click="expanded = !expanded">
      <div class="bar-left">
        <GitCommitHorizontal :size="13" class="bar-icon" />
        <template v-if="lastChange">
          <span class="last-save">
            <Clock :size="11" />
            {{ timeAgo(lastChange.created_at) }}
          </span>
          <span class="separator">·</span>
          <span class="last-action">{{ lastChange.description }}</span>
        </template>
        <span v-else class="no-changes">Nenhuma alteração registrada</span>
      </div>
      <div class="bar-right">
        <span class="changes-count" v-if="changes.length">{{ changes.length }} alterações</span>
        <component :is="expanded ? ChevronDown : ChevronUp" :size="13" />
      </div>
    </div>

    <Transition name="slide">
      <div class="changelog-panel" v-if="expanded">
        <div class="commit-list">
          <div
            v-for="(change, i) in visibleChanges"
            :key="i"
            class="commit-entry"
          >
            <div class="commit-graph">
              <div class="commit-line" v-if="i > 0"></div>
              <div class="commit-dot" :style="{ borderColor: actionColor(change.action) }">
                <component :is="actionIcon(change.action)" :size="10" :color="actionColor(change.action)" />
              </div>
              <div class="commit-line-bottom" v-if="i < visibleChanges.length - 1"></div>
            </div>
            <div class="commit-info">
              <span class="commit-desc">{{ change.description }}</span>
              <div class="commit-meta">
                <code class="commit-hash">{{ change.slide_hash }}</code>
                <span class="commit-time">{{ timeAgo(change.created_at) }}</span>
              </div>
            </div>
          </div>
          <div v-if="changes.length === 0" class="empty-state">
            Nenhuma alteração registrada ainda
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.changelog {
  position: relative;
  border-top: 1px solid #30363d;
  background: #0d1117;
}

.changelog-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px;
  cursor: pointer;
  user-select: none;
  font-size: 11px;
  color: #8b949e;
  background: #161b22;
  transition: background 0.15s;
}

.changelog-bar:hover {
  background: #1c2128;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.bar-icon {
  flex-shrink: 0;
  color: #58a6ff;
}

.last-save {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #7ee787;
  white-space: nowrap;
}

.separator {
  color: #484f58;
}

.last-action {
  color: #c9d1d9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-changes {
  color: #484f58;
  font-style: italic;
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.changes-count {
  color: #484f58;
}

.changelog-panel {
  max-height: 200px;
  overflow-y: auto;
  border-top: 1px solid #21262d;
}

.commit-list {
  padding: 8px 0;
}

.commit-entry {
  display: flex;
  align-items: stretch;
  padding: 0 16px;
}

.commit-graph {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
  position: relative;
}

.commit-line,
.commit-line-bottom {
  width: 1px;
  flex: 1;
  background: #30363d;
}

.commit-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #30363d;
  background: #0d1117;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
}

.commit-info {
  flex: 1;
  padding: 6px 0 6px 10px;
  min-width: 0;
}

.commit-desc {
  font-size: 12px;
  color: #e6edf3;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.commit-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.commit-hash {
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #58a6ff;
  background: rgba(88, 166, 255, 0.1);
  padding: 1px 5px;
  border-radius: 3px;
}

.commit-time {
  font-size: 10px;
  color: #484f58;
}

.empty-state {
  text-align: center;
  padding: 16px;
  color: #484f58;
  font-size: 12px;
  font-style: italic;
}

.slide-enter-active,
.slide-leave-active {
  transition: max-height 0.2s ease, opacity 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 200px;
  opacity: 1;
}
</style>
