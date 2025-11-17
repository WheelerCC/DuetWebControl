<template>
  <div class="flex flex-row gap-5 w-full">
    <div class="grow flex flex-col">
      <p class="mb-1">
        {{ $t('panel.fan.selection') }}
      </p>

      <ToggleGroup v-model="fan" variant="outline" type="single">
        <ToggleGroupItem v-if="currentTool && currentTool.fans.length > 0" :value="-1">
          {{ $t('panel.fan.toolFan') }}
        </ToggleGroupItem>

        <template v-for="(_fan, index) in fans">
          <ToggleGroupItem
            v-if="_fan && _fan.thermostatic.sensors.length === 0"
            :key="index"
            :value="index"
            :disabled="uiFrozen"
          >
            {{ _fan.name ? _fan.name : $t('panel.fan.fan', [index]) }}
          </ToggleGroupItem>
        </template>
      </ToggleGroup>
    </div>

    <!-- Even though RRF allows multiple fans to be assigned to a tool, -->
    <!-- we assume they all share the same fan value if such a config is set -->

    <Slider
      v-if="fanIndex >= 0 && fanIndex < fans.length && fans[fanIndex] !== null"
      v-model="fanValues[fanIndex]"
      :max="maxFanValue"
      :min="0"
      :step="1"
      :disabled="uiFrozen"
      @value-commit="(payload) => setFanValue(fanIndex, payload[0])"
    />
  </div>
</template>

<script setup lang="ts">
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { storeToRefs } from 'pinia'

import { computed, onMounted, ref, watch } from 'vue'
import { Slider } from '../ui/slider'

let fan = ref(-1)

let { uiFrozen } = storeToRefs(useRootStore())
let { fans, currentTool } = storeToRefs(useMachinesModelStore())

let fanValues = ref(fans.value.map((fan) => (fan ? [fan.requestedValue * 100] : undefined)))

watch(
  fans,
  (newVal, oldVal) => {
    fanValues.value = newVal.map((fan) => (fan ? [fan.requestedValue * 100] : undefined))
  },
  { deep: true },
)

let maxFanValue = computed(() => {
  return fanIndex.value >= 0 &&
    fanIndex.value < fans.value.length &&
    fans.value[fanIndex.value] !== null
    ? Math.round(fans.value[fanIndex.value]!.max * 100)
    : 100
})

let fanIndex = computed(() => {
  return fan.value === -1
    ? currentTool.value && currentTool.value.fans.length > 0
      ? currentTool.value.fans[0]
      : -1
    : fan.value
})

async function setFanValue(fanIndex: number, value: number) {
  const constrainedValue = (Math.min(100, Math.max(0, value)) / 100).toFixed(2)

  if (fanIndex <= -1) {
    await useMachinesStore().sendCode(`M106 S${constrainedValue}`)
  } else {
    await useMachinesStore().sendCode(`M106 P${fanIndex} S${constrainedValue}`)
  }
}

watch(currentTool, (newVal, oldVal) => {
  updateFanSelection()
})
watch(
  fans,
  (newVal, oldVal) => {
    updateFanSelection()
  },
  { deep: true },
)

function updateFanSelection() {
  if (fan.value === -1) {
    if (!currentTool.value) {
      // Tool no longer selected, try to change to the first available fan
      fan.value = fans.value.findIndex(
        (fan) => fan !== null && fan.thermostatic.sensors.length === 0,
      )
    }
  } else {
    const _fan = fan.value >= 0 && fan.value < fans.value.length ? fans.value[fan.value] : null
    if (_fan === null || _fan.thermostatic.sensors.length > 0) {
      // Previously elected fan is no longer controllable, try to change to another one
      if (currentTool.value) {
        fan.value = -1
      } else {
        fan.value = fans.value.findIndex(
          (fan) => fan !== null && fan.thermostatic.sensors.length === 0,
        )
      }
    }
  }
}

onMounted(() => {
  updateFanSelection()
})
</script>
