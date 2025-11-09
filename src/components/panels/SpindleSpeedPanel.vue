<template>
  <table>
    <thead>
      <tr>
        <th>
          {{ t('panel.spindle.spindle') }}
        </th>
        <th>
          {{ t('panel.spindle.active') }}
        </th>
        <th v-show="hasReverseableSpindle">
          {{ t('panel.spindle.direction') }}
        </th>
        <th>
          {{ t('panel.spindle.currentRPM') }}
        </th>
        <th>
          {{ t('panel.spindle.setRPM') }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(spindle, index) in spindles.filter(
          (spindle) => spindle !== null && isConfigured(spindle),
        )"
        :key="index"
        class="text-xs"
        :class="{ 'spindle-active': (spindle!.current ?? 0) > 0 && (spindle!.active ?? 0) > 0 }"
      >
        <td>
          {{ getName(index) }}
        </td>
        <td>
          <Button v-if="spindlesActive[index]" @click="useMachinesStore().spindleOff(index)">
            {{ t('panel.spindle.on') }}
          </Button>
          <Button v-else @click="useMachinesStore().spindleOn(index)">
            {{ t('panel.spindle.off') }}
          </Button>
        </td>
        <td>
          <Button @click="toggleSpindleDirection(index)">
            <RedoDot v-if="spindle!.state == SpindleState.forward" />
            <UndoDot v-else />
          </Button>
        </td>
        <td>
          {{ spindle!.current }}
        </td>
        <td>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline">{{ spindle?.active }} </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem
                v-for="(rpm, rpmIndex) in getValidRpm(spindle!)"
                :key="rpmIndex"
                @select="useMachinesStore().setActiveRPM(index, rpm)"
              >
                {{ rpm }}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { Spindle, SpindleState } from '@duet3d/objectmodel'
import { storeToRefs } from 'pinia'

import { RedoDot, UndoDot } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '../ui/button'

let { spindles } = storeToRefs(useMachinesModelStore())
let { t } = useI18n()
let hasReverseableSpindle = computed(() => {
  return spindles.value.some((spindle) => spindle?.canReverse)
})

function getName(spindleIndex: number) {
  return `${spindleIndex}`
}

function isConfigured(spindle: Spindle) {
  return spindle.state !== SpindleState.unconfigured
}

const spindlesActive = computed(() => {
  return spindles.value.map((spindle) => {
    if (!spindle) {
      return false
    } else {
      return spindle.state == SpindleState.forward || spindle.state == SpindleState.reverse
    }
  })
})

function getValidRpm(spindle: Spindle) {
  if (spindle.min === null || spindle.max === null) {
    return []
  }

  const rpmValues = useMachinesSettingsStore().spindleRPM.filter(
    (rpm) => rpm >= spindle.min! && rpm <= spindle.max!,
  )
  if (!rpmValues.includes(0)) {
    rpmValues.push(0)
  }
  rpmValues.sort((a, b) => a - b)
  return rpmValues
}

function toggleSpindleDirection(index) {
  console.log('todo find gcode to actually reverse')
  if (spindles.value[index]!.state == SpindleState.forward) {
    // spindles.value[index]!.state = SpindleState.reverse
  } else if (spindles.value[index]!.state == SpindleState.reverse) {
    // spindles.value[index]!.state = SpindleState.forward
  }
}
</script>
