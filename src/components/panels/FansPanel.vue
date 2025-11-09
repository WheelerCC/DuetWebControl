<template>
  <CardHeader>
    <CardTitle class="flex flex-row gap-2 items-center">
      <FanLucide :size="18" />
      {{ $t('panel.fans.caption') }}

      <Menubar
        class="ml-auto"
        v-show="
          !uiFrozen && fans.some((fan) => fan !== null && fan.thermostatic.sensors.length === 0)
        "
      >
        <MenubarMenu>
          <MenubarTrigger> {{ $t('panel.fans.changeVisibility') }}</MenubarTrigger>
          <MenubarContent>
            <div v-for="(fan, index) in fans" :key="index">
              <MenubarCheckboxItem
                v-if="fan !== null && fan.thermostatic.sensors.length === 0"
                :model-value="displayedFans.includes(index)"
                @select="useMachinesSettingsStore().toggleFanVisibility(index)"
              >
                {{ fan!.name ? fan!.name : $t('panel.fans.fan', [index]) }}
              </MenubarCheckboxItem>
            </div>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </CardTitle>
  </CardHeader>

  <CardContent v-if="hasVisibleFans" class="flex flex-col gap-2">
    <div v-if="displayedFans.includes(-1) && toolFanValue >= 0">
      {{ $t('panel.fans.toolFan') }}
      <Slider
        :model-value="[toolFanValue]"
        :max="100"
        :min="0"
        :step="1"
        :disabled="uiFrozen"
        @value-commit="(payload) => setFanValue(-1, payload[0])"
      />
    </div>

    <div v-for="(fan, index) in fans" :key="index" class="flex flex-col gap-5">
      <div
        v-if="
          fan &&
          displayedFans.includes(index) &&
          fan !== null &&
          fan.thermostatic.sensors.length === 0
        "
      >
        {{ fan!.name ? fan!.name : $t('panel.fans.fan', [index]) }}
        <Slider
          v-model="fanValues[index]!"
          :max="100"
          :min="0"
          :step="1"
          :disabled="uiFrozen"
          @value-commit="(payload) => setFanValue(index, payload[0])"
        />
      </div>
    </div>
  </CardContent>

  <div v-if="!hasVisibleFans">
    {{ $t('panel.fans.noFans') }}
  </div>
</template>

<script setup lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { storeToRefs } from 'pinia'

import { Fan as FanLucide } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
} from '../ui/menubar'
import { Slider } from '../ui/slider'

let { uiFrozen } = storeToRefs(useRootStore())
let { displayedFans } = storeToRefs(useMachinesSettingsStore())
let { fans } = storeToRefs(useMachinesModelStore())
let fanValues = ref(fans.value.map((fan) => (fan ? [fan.requestedValue * 100] : undefined)))

// idk why, but watching the ref isnt updating if you toggle fan speed from another dwc tab. but ref.value does?
watch(fans.value, (newVal, oldVal) => {
  fanValues.value = newVal.map((fan) => (fan ? [fan.requestedValue * 100] : undefined))
})
let currentTool = computed(() => {
  return useMachinesModelStore().currentTool()
})
// todo why do these exist?
// function isFanVisible(fanIndex: number) {
//   if (fanIndex <= -1) {
//     return currentTool.value !== null && currentTool.value.fans.length > 0
//   }
//   return (
//     fanIndex < fans.value.length &&
//     fans.value[fanIndex] !== null &&
//     fans.value[fanIndex]!.thermostatic.sensors.length === 0
//   )
// }
// function getFanValue(fanIndex: number) {
//   if (fanIndex <= -1) {
//     fanIndex = toolFan.value
//   }
//   return fanIndex >= 0 && fanIndex < fans.value.length && fans.value[fanIndex] !== null
//     ? Math.round(fans.value[fanIndex]!.requestedValue * 100)
//     : 0
// }
async function setFanValue(fanIndex: number, value: number) {
  if (fanIndex <= -1) {
    await useMachinesStore().sendCode(`M106 S${value / 100}`)
  } else {
    await useMachinesStore().sendCode(`M106 P${fanIndex} S${value / 100}`)
  }
}

let toolFan = computed(() => {
  if (currentTool.value !== null && currentTool.value.fans.length > 0) {
    return currentTool.value.fans[0]
  }
  return -1
})
let toolFanValue = computed(() => {
  if (
    toolFan.value >= 0 &&
    toolFan.value < fans.value.length &&
    fans.value[toolFan.value] !== null
  ) {
    return fans.value[toolFan.value]!.requestedValue * 100
  }
  return 0
})
let hasVisibleFans = computed(() => {
  if (
    fans.value.some(
      (fan, index) =>
        displayedFans.value.includes(index) &&
        fan !== null &&
        fan.thermostatic.sensors.length === 0,
    )
  ) {
    return true
  }
  return (
    displayedFans.value.includes(-1) &&
    toolFan.value >= 0 &&
    toolFan.value < fans.value.length &&
    fans.value[toolFan.value] !== null &&
    fans.value[toolFan.value]!.thermostatic.sensors.length === 0
  )
})
</script>
