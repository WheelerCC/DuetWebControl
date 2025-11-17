<template>
  <Button
    class="cursor-pointer"
    :disabled="disabled || uiFrozen"
    :loading="waitingForCode"
    @click="click"
    :variant="variant"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <slot />
  </Button>
</template>

<script setup lang="ts">
import { Button, ButtonVariants } from '@/components/ui/button'
import { useRootStore } from '@/stores'
import { useMachinesStore } from '@/stores/machines'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

interface Props {
  variant?: ButtonVariants['variant']
  code: string
  count?: number
  disabled?: boolean
  log?: boolean
  noWait?: boolean
}

const {
  code,
  disabled = false,
  log = true,
  noWait = false,
  variant = 'default',
} = defineProps<Props>()

let { uiFrozen } = storeToRefs(useRootStore())
const waitingForCode = ref(false)

async function click() {
  try {
    if (noWait) {
      await useMachinesStore().sendCode({
        code: code,
        log: log ?? true,
        noWait: true,
      })
    } else {
      waitingForCode.value = true
      try {
        await useMachinesStore().sendCode({
          code: code,
          log: log ?? true,
        })
      } finally {
        waitingForCode.value = false
      }
    }
  } catch (e) {
    // handled before we get here
  }
}
</script>
