<template>
  <div class="flex flex-col gap-1">
    {{ $t('panel.babystepping.current', [displayZ(babystepping)]) }}

    <CodeBtn :code="`M290 R1 Z${-babystepAmount}`" no-wait block>
      <FoldVertical />
      {{ displayZ(-babystepAmount) }}
    </CodeBtn>

    <CodeBtn :code="`M290 R1 Z${babystepAmount}`" no-wait block>
      <UnfoldVertical />
      +{{ displayZ(babystepAmount) }}
    </CodeBtn>
  </div>
</template>

<script setup lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { displayZ } from '@/utils/display'
import { AxisLetter } from '@duet3d/objectmodel'

import { FoldVertical, UnfoldVertical } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import CodeBtn from '../buttons/CodeBtn.vue'

let { babystepAmount } = storeToRefs(useMachinesSettingsStore())
let { move } = storeToRefs(useMachinesModelStore())

let babystepping = computed(() => {
  return move.value.axes.find((axis) => axis.letter === AxisLetter.Z)?.babystep ?? 0
})
</script>
