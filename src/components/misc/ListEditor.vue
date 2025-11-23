<template>
  <Card>
    <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <template v-if="!(items instanceof Array)">
        <div class="flex flex-col gap-4">
          <h3 class="text-center">
            {{ $t('generic.active') }}
          </h3>
          <div class="flex flex-row flex-wrap gap-1">
            <Badge variant="secondary" v-for="(temp, index) in items.active" :key="temp">
              {{ temp }} {{ unit }}
              <button type="button" class="ml-1 cursor-pointer" @click="removeActive(index)">
                ×
              </button>
            </Badge>
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <h3 class="text-center">
            {{ $t('generic.standby') }}
          </h3>

          <div class="flex flex-row flex-wrap gap-1">
            <Badge variant="secondary" v-for="(temp, index) in items.standby" :key="temp">
              {{ temp }} {{ unit }}
              <button type="button" class="ml-1 cursor-pointer" @click="removeStandby(index)">
                ×
              </button>
            </Badge>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <Label class="text-xs">
            {{ $t('input.addTemperature') }}
          </Label>
          <div class="flex flex-row items-center gap-2 w-full">
            <Input
              v-model.number="activeValue"
              type="number"
              min="-273"
              max="1999"
              @keyup.enter="addActive"
            />
            <Button color="primary" :disabled="!canAddActive" @click="addActive">
              <Plus /> {{ $t('button.add.caption') }}
            </Button>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <Label class="text-xs">
            {{ $t('input.addTemperature') }}
          </Label>
          <div class="flex flex-row items-center gap-2 w-full">
            <Input
              v-model.number="standbyValue"
              type="number"
              min="-273"
              max="1999"
              :label="$t('input.addTemperature')"
              hide-details
              @keyup.enter="canAddStandby && addStandby"
            />

            <Button color="primary" :disabled="!canAddStandby" @click="addStandby">
              <Plus /> {{ $t('button.add.caption') }}
            </Button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="col-span-full flex flex-row flex-wrap gap-1">
          <Badge variant="secondary" v-for="(temp, index) in items" :key="temp">
            {{ temp }} {{ unit }}
            <button type="button" class="ml-1 cursor-pointer" @click="remove(index)">×</button>
          </Badge>
        </div>

        <div class="col-span-full flex flex-col">
          <template v-if="temperature">
            <Label class="text-xs">
              {{ $t('input.addTemperature') }}
            </Label>
            <div class="flex flex-row items-center gap-2 w-full">
              <Input
                v-model.number="value"
                type="number"
                min="-273"
                max="1999"
                @keyup.enter="canAdd && add"
              />
              <Button color="primary" :disabled="!canAdd" @click="add">
                <Plus /> {{ $t('button.add.caption') }}
              </Button>
            </div>
          </template>
          <template v-else>
            <Label class="text-xs">
              {{ $t('input.addRPM') }}
            </Label>
            <div class="flex flex-row">
              <Input
                v-model.number="value"
                type="number"
                min="0"
                @keyup.enter="canAdd && add"
                class="text-xs"
              />
              <Button color="primary" :disabled="!canAdd" @click="add">
                <Plus /> {{ $t('button.add.caption') }}
              </Button>
            </div>
          </template>
        </div>
      </template>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { MachineSettingsState, useMachinesSettingsStore } from '@/stores/machineSettings'
import { Plus } from 'lucide-vue-next'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

let activeValue = ref(0)
let standbyValue = ref(0)
let value = ref(0)

const { itemKey, temperature = false } = defineProps<{
  itemKey: keyof MachineSettingsState['temperatures'] | 'spindleRPM'
  temperature?: boolean
}>()

let items = computed(() => {
  return itemKey === 'spindleRPM'
    ? useMachinesSettingsStore().spindleRPM
    : useMachinesSettingsStore().temperatures[itemKey]
})

let unit = computed(() => {
  return temperature ? '°C' : 'RPM'
})

let canAddActive = computed(() => {
  return (
    isFinite(activeValue.value) &&
    !(items.value instanceof Array) &&
    !items.value.active.includes(activeValue.value)
  )
})

let canAddStandby = computed(() => {
  return (
    isFinite(standbyValue.value) &&
    !(items.value instanceof Array) &&
    !items.value.standby.includes(standbyValue.value)
  )
})
let canAdd = computed(() => {
  return isFinite(value.value) && items.value instanceof Array && !items.value.includes(value.value)
})

function removeActive(index: number) {
  if (items.value instanceof Array) {
    return
  }

  useMachinesSettingsStore().update({
    temperatures: {
      [itemKey]: {
        active: items.value.active.filter((_, i) => i !== index),
      },
    },
  })
}
function addActive() {
  if (items.value instanceof Array) {
    return
  }

  if (canAddActive.value) {
    const updateData = {
      temperatures: {
        [itemKey]: {
          active: items.value.active.slice(),
        },
      },
    }
    updateData.temperatures[itemKey].active.push(activeValue.value)
    updateData.temperatures[itemKey].active.sort((a, b) => b - a)
    useMachinesSettingsStore().update(updateData)
  }
}
function removeStandby(index: number) {
  if (items.value instanceof Array) {
    return
  }
  useMachinesSettingsStore().update({
    temperatures: {
      [itemKey]: {
        standby: items.value.standby.filter((_, i) => i !== index),
      },
    },
  })
}
function addStandby() {
  if (items.value instanceof Array) {
    return
  }

  if (canAddStandby.value) {
    const updateData = {
      temperatures: {
        [itemKey]: {
          standby: items.value.standby.slice(),
        },
      },
    }
    updateData.temperatures[itemKey].standby.push(standbyValue.value)
    updateData.temperatures[itemKey].standby.sort((a, b) => b - a)
    useMachinesSettingsStore().update(updateData)
  }
}
function remove(index: number) {
  if (items.value instanceof Array) {
    if (itemKey === 'spindleRPM') {
      useMachinesSettingsStore().update({
        spindleRPM: items.value.filter((_, i) => i !== index),
      })
    } else {
      useMachinesSettingsStore().update({
        temperatures: {
          [itemKey]: items.value.filter((_, i) => i !== index),
        },
      })
    }
  }
}
function add() {
  if (items.value instanceof Array && canAdd.value) {
    let updateData
    if (itemKey === 'spindleRPM') {
      updateData = {
        spindleRPM: items.value.slice(),
      }
      updateData.spindleRPM.push(value.value)
      updateData.spindleRPM.sort((a, b) => b - a)
    } else {
      updateData = {
        temperatures: {
          [itemKey]: items.value.slice(),
        },
      }
      updateData.temperatures[itemKey].push(value.value)
      updateData.temperatures[itemKey].sort((a, b) => b - a)
    }
    useMachinesSettingsStore().update(updateData)
  }
}
</script>
