<template>
  <Button class="cursor-pointer" @click="clicked" :variant="buttonVariant">
    <component v-if="!isBusy" :is="buttonIcon" /> {{ caption }}
    <Spinner v-show="isBusy" size="20" indeterminate />
  </Button>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useRootStore } from '@/stores'
import { useMachinesStore } from '@/stores/machines'
import { CircleX, Power } from 'lucide-vue-next'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Spinner } from '../ui/spinner'

const rootStore = useRootStore()
const machinesStore = useMachinesStore()
const { t } = useI18n()
console.log('todo button colour')

const isConnected = computed(() => rootStore.isConnected)
const isBusy = computed(
  () => rootStore.isConnecting || machinesStore.isReconnecting || rootStore.isDisconnecting,
)
const buttonVariant = computed(() =>
  isBusy.value ? 'ghost' : isConnected.value ? 'secondary' : 'default',
)
const buttonIcon = computed(() => (isConnected.value ? CircleX : Power))
const caption = computed(() =>
  t(
    rootStore.isConnecting || machinesStore.isReconnecting
      ? 'button.connect.connecting'
      : rootStore.isDisconnecting
        ? 'button.connect.disconnecting'
        : isConnected.value
          ? 'button.connect.disconnect'
          : 'button.connect.connect',
  ),
)

async function clicked() {
  if (isBusy.value) {
    return
  }
  if (isConnected.value) {
    await rootStore.disconnect()
  } else if (process.env.NODE_ENV === 'development') {
    await rootStore.showConnectDialog()
  } else {
    await rootStore.connect()
  }
}
</script>
