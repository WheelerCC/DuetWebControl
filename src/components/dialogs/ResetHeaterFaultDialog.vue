<template>
  <Dialog v-model:open="innerShown">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle class="flex flex-row gap-2 items-center">
          <AlertCircleIcon :size="18" /> {{ $t('dialog.resetHeaterFault.title') }}</DialogTitle
        >
      </DialogHeader>

      {{ $t('dialog.resetHeaterFault.prompt', [heater]) }}

      <DialogFooter>
        <Button color="blue darken-1" text :disabled="!!counter" @click="resetFault">
          {{ $t('dialog.resetHeaterFault.resetFault') + (counter ? ` (${counter})` : '') }}
        </Button>

        <Button color="blue darken-1" text @click="hide">
          {{ $t('generic.cancel') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { useMachinesStore } from '@/stores/machines'

/**
 * How long to wait before a user can reset a heater fault (in s)
 */
const countdownSeconds = 5

import { ref, watch } from 'vue'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircleIcon } from 'lucide-vue-next'
import { Button } from '../ui/button'

let { shown, heater } = defineProps<{
  shown: boolean
  heater: number
}>()

let counter = ref(countdownSeconds)
let resetHeaters = ref<number[]>([])
let timer = ref<NodeJS.Timeout | null>(null)
let innerShown = ref(shown)
let emit = defineEmits(['update:shown'])
watch(
  () => shown,
  (newVal, oldVal) => {
    if (innerShown.value !== newVal) {
      innerShown.value = newVal
    }
    if (newVal) {
      if (!timer.value && !resetHeaters.value.includes(heater)) {
        counter.value = countdownSeconds
        countDown()
      }
    } else if (timer.value) {
      clearTimeout(timer.value)
      timer.value = null
    }
  },
)

watch(innerShown, (newVal, oldVal) => {
  if (shown !== newVal) {
    emit('update:shown', newVal)
  }
})

async function resetFault() {
  try {
    await useMachinesStore().sendCode(`M562 P${heater}`)
    resetHeaters.value.push(heater)
  } finally {
    hide()
  }
}
function hide() {
  innerShown.value = false
}
function countDown() {
  counter.value--
  timer.value = counter.value > 0 ? setTimeout(countDown, 1000) : null
}
</script>
