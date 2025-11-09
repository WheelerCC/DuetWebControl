<template>
  <CardHeader>
    <CardTitle class="flex flex-row items-center gap-2">
      <Timer :size="18" />

      {{ t('panel.speedFactor.caption') }}

      <a
        v-show="speedFactor[0] !== 100 && !uiFrozen"
        href="javascript:void(0)"
        class="ml-auto flex flex-row gap-2 items-center"
        @click.prevent="useMachinesStore().sendCode('M220 S100')"
      >
        <Eraser :size="18" /> {{ t('generic.reset') }}
      </a>
    </CardTitle>
  </CardHeader>

  <CardContent>
    <Slider
      :disabled="uiFrozen"
      :default-value="speedFactor"
      :max="speedFactorMax"
      :min="speedFactorMin"
      :step="1"
      @value-commit="(payload) => useMachinesStore().sendCode(`M220 S${payload[0]}`)"
    />
  </CardContent>
</template>

<script setup lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { Eraser, Timer } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
let { t } = useI18n()

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CardContent, CardHeader, CardTitle } from '../ui/card'
import { Slider } from '../ui/slider'

let { uiFrozen } = storeToRefs(useRootStore())

let speedFactor = computed(() => {
  return useMachinesModelStore().move.speedFactor !== null
    ? [useMachinesModelStore().move.speedFactor * 100]
    : [100]
})

let speedFactorMin = computed(() => {
  return Math.max(1, Math.min(100, speedFactor.value[0] - 50))
})

let speedFactorMax = computed(() => {
  return Math.max(150, speedFactor.value[0] + 50)
})
</script>
