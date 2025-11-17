<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-col gap-1">
      <Label for="lang">{{ $t('panel.settingsAppearance.language') }}</Label>
      <Select id="lang" v-model="language">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ languages[language] }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <template v-for="[_code, _language] in Object.entries(languages)" :key="_code">
              <SelectItem :value="_code"> {{ _language }} </SelectItem>
            </template>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="flex flex-row items-center gap-2">
      <Switch v-model:model-value="useBinaryPrefix" />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            {{ $t('panel.settingsAppearance.binaryFileSizes') }}
          </TooltipTrigger>
          <TooltipContent>
            {{ $t('panel.settingsAppearance.binaryFileSizesTitle') }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <div class="flex flex-row items-center gap-2">
      <Switch v-model="disableAutoComplete" />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            {{ $t('panel.settingsAppearance.disableAutoComplete') }}
          </TooltipTrigger>
          <TooltipContent>
            {{ $t('panel.settingsAppearance.disableAutoCompleteTitle') }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="dash">{{ $t('panel.settingsAppearance.dashboardModeTitle') }}</Label>
      <Select id="dash" v-model="dashboardMode">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ dashboardModes[dashboardMode] }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <template v-for="[_key, _val] in Object.entries(dashboardModes)" :key="_key">
              <SelectItem :value="_key"> {{ _val }} </SelectItem>
            </template>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="flex flex-row items-center gap-2">
      <Switch v-model="bottomNavigation" />
      {{ $t('panel.settingsAppearance.bottomNavigation') }}
    </div>

    <div class="flex flex-row items-center gap-2">
      <Switch v-model="numericInputs" />
      {{ $t('panel.settingsAppearance.numericInputs') }}
    </div>

    <div class="flex flex-row items-center gap-2">
      <Switch v-model="iconMenu" />
      {{ $t('panel.settingsAppearance.iconMenu') }}
    </div>

    <div class="flex flex-col gap-1">
      <Label for="decimalPlaces">{{ $t('panel.settingsAppearance.decimalPlaces') }}</Label>
      <Select id="decimalPlaces" v-model="decimalPlaces">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ decimalPlaces }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <template v-for="i in [0, 1, 2, 3]" :key="i">
              <SelectItem :value="i"> {{ i }} </SelectItem>
            </template>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="displayUnits">{{ $t('panel.settingsAppearance.displayUnitsTitle') }}</Label>
      <Select id="displayUnits" v-model="displayUnits">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ unitsOfMeasure[displayUnits] }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <template v-for="[_key, _val] in Object.entries(unitsOfMeasure)" :key="_key">
              <SelectItem :value="_key"> {{ _val }} </SelectItem>
            </template>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DashboardMode, UnitOfMeasure, useSettingsStore } from '@/stores/settings'

import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

let {
  language,
  useBinaryPrefix,
  disableAutoComplete,
  dashboardMode,
  bottomNavigation,
  numericInputs,
  iconMenu,
  displayUnits,
  decimalPlaces,
} = storeToRefs(useSettingsStore())

let languages = computed<{ [code: string]: string }>(() => {
  let { availableLocales, messages } = useI18n()

  const result: { [code: string]: string } = {}
  for (let key of availableLocales) {
    result[key] = messages.value[key]['language'].toString()
  }
  return result
})

let dashboardModes = computed<{ [code: string]: string }>(() => {
  const result: { [code: string]: string } = {}
  Object.entries(DashboardMode).forEach(([key, value]) => {
    result[key] = value
  })
  return result
})

let unitsOfMeasure = computed(() => {
  const result: { [code: string]: string } = {}
  Object.entries(UnitOfMeasure).forEach(([key, value]) => {
    result[key] = value
  })
  return result
})
</script>
