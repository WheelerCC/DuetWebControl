<template>
  <div class="flex flex-row gap-5 w-full">
    <div class="grow flex flex-col" v-if="currentTool && currentTool.extruders.length > 1">
      <p class="mb-1">
        {{ $t('panel.extrude.mixRatio') }}
      </p>

      <ToggleGroup v-model:model-value="mix" variant="outline" type="multiple">
        <ToggleGroupItem text value="mix" :disabled="uiFrozen" color="primary">
          {{ $t('panel.extrude.mix') }}
        </ToggleGroupItem>
        <ToggleGroupItem
          v-for="extruder in currentTool.extruders"
          :key="extruder"
          text
          :value="extruder"
          :disabled="uiFrozen"
          color="primary"
        >
          {{ `E${extruder}` }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
    <div class="grow flex flex-col">
      <p class="mb-1">
        {{ $t('panel.extrude.amount', ['mm']) }}
      </p>
      <ToggleGroup class="w-full" v-model:model-value="amount" variant="outline" type="single">
        <ToggleGroupItem
          v-for="(savedAmount, index) in extruderAmounts"
          :key="index"
          :value="savedAmount"
          :disabled="uiFrozen"
          class="flex-grow-1"
          @contextmenu.prevent="editAmount(index)"
        >
          {{ savedAmount }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
    <div class="grow flex flex-col">
      <p class="mb-1">
        {{ $t('panel.extrude.feedrate', ['mm/s']) }}
      </p>
      <ToggleGroup class="w-full" v-model:model-value="feedrate" variant="outline" type="single">
        <ToggleGroupItem
          v-for="(savedFeedrate, index) in extruderFeedrates"
          :key="index"
          :value="savedFeedrate"
          :disabled="uiFrozen"
          class="flex-grow-1"
          @contextmenu.prevent="editFeedrate(index)"
        >
          {{ savedFeedrate }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
    <div class="grow flex flex-col">
      <ButtonGroup class="w-full" orientation="vertical" aria-label="Media controls">
        <Button
          variant="outline"
          :disabled="uiFrozen || !canRetract"
          :loading="busy"
          @click="buttonClicked(false)"
        >
          <ArrowBigUp /> {{ $t('panel.extrude.retract') }}
        </Button>
        <Button
          variant="outline"
          :disabled="uiFrozen || !canExtrude"
          :loading="busy"
          @click="buttonClicked(true)"
        >
          <ArrowBigDown /> {{ $t('panel.extrude.extrude') }}
        </Button>
      </ButtonGroup>
    </div>
  </div>

  <InputDialog
    v-model:shown="editAmountDialog.shown"
    :title="$t('dialog.editExtrusionAmount.title')"
    :prompt="$t('dialog.editExtrusionAmount.prompt')"
    :preset="editAmountDialog.preset"
    is-numeric-value
    @confirmed="setAmount"
  />
  <InputDialog
    v-model:shown="editFeedrateDialog.shown"
    :title="$t('dialog.editExtrusionFeedrate.title')"
    :prompt="$t('dialog.editExtrusionFeedrate.prompt')"
    :preset="editFeedrateDialog.preset"
    is-numeric-value
    @confirmed="setFeedrate"
  />
</template>

<script setup lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { MachineStatus } from '@duet3d/objectmodel'
import { storeToRefs } from 'pinia'

import { computed, onMounted, ref, watch } from 'vue'
import InputDialog from '../dialogs/InputDialog.vue'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ArrowBigDown, ArrowBigUp } from 'lucide-vue-next'
let busy = ref(false)
let mixValue = ref(['mix'] as Array<number | 'mix'>)
let amount = ref(10)
let feedrate = ref(5)
let editAmountDialog = ref({
  shown: false,
  index: 0,
  preset: 0,
})
let editFeedrateDialog = ref({
  shown: false,
  index: 0,
  preset: 0,
})

let { uiFrozen } = storeToRefs(useRootStore())
let { currentTool, state, heat, sensors } = storeToRefs(useMachinesModelStore())
let { extruderAmounts, extruderFeedrates } = storeToRefs(useMachinesSettingsStore())

let canExtrude = computed(() => {
  return (
    state.value.status !== MachineStatus.off &&
    state.value.status !== MachineStatus.pausing &&
    state.value.status !== MachineStatus.processing &&
    state.value.status !== MachineStatus.resuming &&
    currentTool.value !== null &&
    currentTool.value.extruders.length > 0 &&
    !currentTool.value.heaters.some((heaterNumber) => {
      if (
        heaterNumber >= 0 &&
        heaterNumber < heat.value.heaters.length &&
        heat.value.heaters[heaterNumber] !== null
      ) {
        const heaterSensor = heat.value.heaters[heaterNumber]!.sensor
        if (heaterSensor >= 0 && heaterSensor < sensors.value.analog.length) {
          const sensor = sensors.value.analog[heaterSensor]
          return (
            sensor === null ||
            (sensor.lastReading !== null && sensor.lastReading < heat.value.coldExtrudeTemperature)
          )
        }
      }
      return true
    })
  )
})

let canRetract = computed(() => {
  return (
    state.value.status !== MachineStatus.off &&
    state.value.status !== MachineStatus.pausing &&
    state.value.status !== MachineStatus.processing &&
    state.value.status !== MachineStatus.resuming &&
    currentTool.value !== null &&
    currentTool.value.extruders.length > 0 &&
    !currentTool.value.heaters.some((heaterNumber) => {
      if (
        heaterNumber >= 0 &&
        heaterNumber < heat.value.heaters.length &&
        heat.value.heaters[heaterNumber] !== null
      ) {
        const heaterSensor = heat.value.heaters[heaterNumber]!.sensor
        if (heaterSensor >= 0 && heaterSensor < sensors.value.analog.length) {
          const sensor = sensors.value.analog[heaterSensor]
          return (
            sensor === null ||
            (sensor.lastReading !== null && sensor.lastReading < heat.value.coldRetractTemperature)
          )
        }
      }
      return true
    }, this)
  )
})

let mix = computed({
  get: () => mixValue.value,
  set: (value: Array<number | 'mix'>) => {
    if (value.length > 1) {
      if (mixValue.value.indexOf('mix') !== value.indexOf('mix')) {
        // Mix is being toggled
        if (value.indexOf('mix') !== -1) {
          mixValue.value = ['mix']
        } else {
          mixValue.value = value.filter((item) => item !== 'mix')
        }
      } else {
        // Selecting another E drive
        mixValue.value = value.filter((item) => item !== 'mix')
      }
    } else {
      // One value - OK
      mixValue.value = value
    }
  },
})

async function buttonClicked(extrude: boolean) {
  if (!currentTool.value || currentTool.value.extruders.length === 0) {
    return
  }

  let amounts
  if (mixValue.value[0] === 'mix') {
    // Split total amount to extrude evenly
    amounts = [amount.value]
  } else {
    // Extrude given amount via each selected extruder drive
    amounts = currentTool.value.extruders.map((extruder) =>
      mix.value.includes(extruder) ? amount.value : 0,
    )
  }

  busy.value = true
  try {
    const amount = amounts.map((amount) => (extrude ? amount : -amount)).join(':')
    await useMachinesStore().sendCode(`M120\nM83\nG1 E${amount} F${feedrate.value * 60}\nM121`)
  } catch (e) {
    // handled before we get here
  }
  busy.value = false
}
function editAmount(index: number) {
  editAmountDialog.value.index = index
  editAmountDialog.value.preset = extruderAmounts.value[index]
  editAmountDialog.value.shown = true
}
function setAmount(value: number) {
  useMachinesSettingsStore().setExtrusionAmount({ index: editAmountDialog.value.index, value })
  amount.value = value
}
function editFeedrate(index: number) {
  editFeedrateDialog.value.index = index
  editFeedrateDialog.value.preset = extruderFeedrates.value[index]
  editFeedrateDialog.value.shown = true
}
function setFeedrate(value: number) {
  useMachinesSettingsStore().setExtrusionFeedrate({
    index: editFeedrateDialog.value.index,
    value,
  })
  feedrate.value = value
}

watch(currentTool, (newVal, oldVal) => {
  if (!newVal || newVal.extruders.length <= 1) {
    // Switch back to mixing mode if the selection panel is hidden
    mix.value = ['mix']
  }
})

watch(
  extruderAmounts,
  (newVal, oldVal) => {
    amount.value = newVal[3]
  },
  {
    deep: true,
  },
)

watch(
  extruderFeedrates,
  (newVal, oldVal) => {
    feedrate.value = newVal[3]
  },
  {
    deep: true,
  },
)

onMounted(() => {
  amount.value = useMachinesSettingsStore().extruderAmounts[3]
  feedrate.value = useMachinesSettingsStore().extruderFeedrates[3]
})
</script>
