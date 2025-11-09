<template>
  <Dialog v-model:open="shown.value">
    <DialogContent class="max-w-md flex flex-col gap-7">
      <DialogHeader>
        <DialogTitle>{{ message }}</DialogTitle>
      </DialogHeader>

      <div v-if="connectingProgress >= 0 || isConnecting" class="mb-4">
        <Progress :value="connectingProgress" :indeterminate="connectingProgress < 0" />
      </div>

      <div v-if="displayReset && isConnected" class="flex justify-center mt-5">
        <CodeBtn
          code="M999"
          :log="false"
          color="warning"
          :title="t('button.reset.title')"
          class="mx-auto"
        >
          <RefreshCw />
          {{ t('button.reset.caption') }}
        </CodeBtn>
      </div>

      <div v-else-if="isUpdating && boardsBeingUpdated.length > 0" class="flex flex-col mt-3">
        <span class="mb-1">
          {{ t('dialog.connection.boardUpdateMessage', boardsBeingUpdated.length) }}
        </span>
        <span
          v-for="canAddress in boardsBeingUpdated.filter((item) => item > 0)"
          :key="canAddress"
          class="ml-3"
        >
          <component :is="getBoardIcon(canAddress)" />
          {{ getBoardName(canAddress) }}
        </span>
        <span v-if="boardsBeingUpdated.includes(0)">
          <component :is="getBoardIcon(0)" />
          {{ getBoardName(0) }}
        </span>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { MachineStatus } from '@duet3d/objectmodel'

import CodeBtn from '@/components/buttons/CodeBtn.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ArrowBigRight, Asterisk, Check, RefreshCw } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const displayReset = ref(false)
const haltedTimer = ref<NodeJS.Timeout | null>(null)
const updatedBoards = ref<number[]>([])

const { connectingProgress, isConnected, isConnecting, isDisconnecting } =
  storeToRefs(useRootStore())
const { state, boards } = storeToRefs(useMachinesModelStore())
const { boardBeingUpdated, boardsBeingUpdated, isReconnecting } = storeToRefs(useMachinesStore())

const isUpdating = computed(() => state.value.status === MachineStatus.updating)
const shown = computed(() => {
  return (
    isConnecting ||
    connectingProgress.value >= 0 ||
    isReconnecting ||
    isDisconnecting ||
    state.value.status === MachineStatus.halted ||
    state.value.status === MachineStatus.updating
  )
})
const isPersistent = computed(() => {
  if (!(displayReset.value && isConnected.value)) {
    // If the connection is gone, allow this dialog only to be dismissed if running as PWA
    return !window.matchMedia('(display-mode: standalone)').matches
  }
  return false
})

const message = computed(() => {
  if (isConnecting || connectingProgress.value >= 0) {
    return t('dialog.connection.connecting')
  }
  if (isUpdating.value) {
    return t('dialog.connection.updating')
  }
  if (isReconnecting) {
    return t('dialog.connection.reconnecting')
  }
  if (isDisconnecting) {
    return t('dialog.connection.disconnecting')
  }
  return t('dialog.connection.standBy')
})

// Watchers
watch(boardsBeingUpdated, () => {
  updatedBoards.value.splice(0)
})

watch(boardBeingUpdated, (to, from) => {
  if (from >= 0) {
    updatedBoards.value.push(from)
  }
})

watch(state, (to) => {
  const { status } = to
  if (status === MachineStatus.halted) {
    haltedTimer.value = setTimeout(showResetButton, 4000)
  } else {
    if (haltedTimer.value) {
      clearTimeout(haltedTimer.value)
      haltedTimer.value = null
    }
    displayReset.value = false
  }
})

// Methods
function getBoardIcon(canAddress: number) {
  if (boardBeingUpdated.value == canAddress) {
    return ArrowBigRight
  }
  return updatedBoards.value.includes(canAddress) ? Check : Asterisk
}

function getBoardName(canAddress: number) {
  const board = boards.value.find((board) => board.canAddress === canAddress)
  if (board) {
    return canAddress ? `${board.name ?? 'Expansion Board'} (#${canAddress})` : board.name
  }
  return canAddress ? `Board #${canAddress}` : 'Mainboard'
}

function showResetButton() {
  haltedTimer.value = null
  displayReset.value = true
}
</script>
