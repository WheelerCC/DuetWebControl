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

import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Spinner } from '../ui/spinner'

const { t } = useI18n()
console.log('todo button colour')

let { isConnected, isConnecting, isDisconnecting } = storeToRefs(useRootStore())
let { isReconnecting } = storeToRefs(useMachinesStore())

const isBusy = computed(() => isConnecting.value || isReconnecting.value || isDisconnecting.value)
const buttonVariant = computed(() =>
  isBusy.value ? 'ghost' : isConnected.value ? 'secondary' : 'default',
)
const buttonIcon = computed(() => (isConnected.value ? CircleX : Power))
const caption = computed(() =>
  t(
    isConnecting.value || isReconnecting.value
      ? 'button.connect.connecting'
      : isDisconnecting.value
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
    await useRootStore().disconnect()
  } else if (process.env.NODE_ENV === 'development') {
    await useRootStore().showConnectDialog()
  } else {
    await useRootStore().connect()
  }
}
</script>
