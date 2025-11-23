<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div class="flex flex-col gap-1">
      <Label>{{ $t('panel.settingsMachine.babystepAmount', ['mm']) }}</Label>
      <Input v-model.number="internalBabystepAmount" type="number" step="any" min="0.001" />
    </div>

    <div class="flex flex-row gap-1 items-center">
      <Switch v-model="checkVersions" />
      <Label>{{ $t('panel.settingsMachine.checkVersions') }}</Label>
    </div>

    <div class="flex flex-col gap-1">
      <Label>{{ $t('panel.settingsMachine.moveFeedrate', ['mm/min']) }}</Label>
      <Input v-model.number="internalMoveFeedrate" type="number" step="any" min="0.001" />
    </div>

    <div class="flex flex-col gap-1">
      <Label>{{ $t('panel.settingsMachine.toolChangeMacros') }}</Label>
      <Popover v-model:open="comboboxOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            role="combobox"
            :aria-expanded="comboboxOpen"
            class="justify-between"
          >
            <div class="flex flex-wrap gap-1">
              <Badge
                v-for="macro in selectedMacros"
                :key="macro.value"
                variant="secondary"
                class="text-xs"
              >
                {{ macro.text }}
                <button
                  type="button"
                  class="ml-1 hover:bg-muted-foreground/20 rounded-full"
                  @click.stop="removeToolChangeMacro(macro.value)"
                >
                  ×
                </button>
              </Badge>
              <span v-if="selectedMacros.length === 0" class="text-muted-foreground">
                Select macros...
              </span>
            </div>
            <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent class="p-0">
          <Command>
            <CommandInput placeholder="Search macros..." />
            <CommandEmpty>No macro found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                v-for="macro in toolChangeMacroList"
                :key="macro.value"
                :value="macro.text"
                @select="toggleMacro(macro)"
              >
                <Check
                  :class="[
                    'mr-2 h-4 w-4',
                    toolChangeMacros.includes(macro.value) ? 'opacity-100' : 'opacity-0',
                  ]"
                />
                {{ macro.text }}
              </CommandItem>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>

    <div class="flex flex-row gap-1 items-center">
      <Switch v-model="groupTools" />
      <Label>{{ $t('panel.settingsAppearance.groupTools') }}</Label>
    </div>

    <div class="flex flex-row gap-1 items-center">
      <Switch v-model="singleBedControl" />
      <Label>{{ $t('panel.settingsAppearance.singleBedControl') }}</Label>
    </div>

    <div class="flex flex-row gap-1 items-center">
      <Switch v-model="singleChamberControl" />
      <Label>{{ $t('panel.settingsAppearance.singleChamberControl') }}</Label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ToolChangeMacro, useMachinesSettingsStore } from '@/stores/machineSettings'
import { storeToRefs } from 'pinia'

import { Check, ChevronsUpDown } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Switch } from '../ui/switch'

let toolChangeMacroList = ref([
  {
    text: 'tfree.g',
    value: ToolChangeMacro.free,
  },
  {
    text: 'tpre.g',
    value: ToolChangeMacro.pre,
  },
  {
    text: 'tpost.g',
    value: ToolChangeMacro.post,
  },
])

let machineSettingsStore = useMachinesSettingsStore()
let {
  babystepAmount,
  checkVersions,
  moveFeedrate,
  toolChangeMacros,
  groupTools,
  singleBedControl,
  singleChamberControl,
} = storeToRefs(machineSettingsStore)

let comboboxOpen = ref(false)

let selectedMacros = computed(() =>
  toolChangeMacroList.value.filter((macro) => toolChangeMacros.value.includes(macro.value)),
)

let internalBabystepAmount = computed({
  get(): number {
    return babystepAmount.value
  },
  set(value: number) {
    if (isFinite(value) && value > 0) {
      machineSettingsStore.setBabystepAmount(value)
    }
  },
})

let internalMoveFeedrate = computed({
  get(): number {
    return moveFeedrate.value
  },
  set(value: number) {
    if (isFinite(value) && value > 0) {
      machineSettingsStore.setMoveFeedrate(value)
    }
  },
})

function removeToolChangeMacro(item: ToolChangeMacro) {
  machineSettingsStore.setToolChangeMacros(toolChangeMacros.value.filter((macro) => macro !== item))
}

function toggleMacro(macro: { text: string; value: ToolChangeMacro }) {
  const currentMacros = [...toolChangeMacros.value]
  const index = currentMacros.indexOf(macro.value)

  if (index > -1) {
    currentMacros.splice(index, 1)
  } else {
    currentMacros.push(macro.value)
  }

  machineSettingsStore.setToolChangeMacros(currentMacros)
}
</script>
