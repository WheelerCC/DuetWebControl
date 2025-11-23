<template>
  <!-- <v-form submit.prevent="apply">
    <v-combobox
      ref="input"
      type="number"
      min="-273"
      max="1999"
      step="any"
      :label="label"
      :menu-props="{ maxHeight: '50%' }"
      :value="inputValue"
      :search-input="inputValue"
      :loading="applying"
      :disabled="disabled || uiFrozen || !isValid"
      :items="items"
      hide-selected
      @update:search-input="change"
      @blur="blur"
      @keydown.enter.prevent="apply"
    />
  </v-form> -->
  <form @submit.prevent="apply">
    <Combobox
      :open-on-click="true"
      v-model="inputValue"
      v-model:open="comboBoxOpen"
      :disabled="disabled || uiFrozen || !isValid"
      @update:model-value="change"
    >
      <ComboboxAnchor>
        <div class="relative w-full items-center">
          <ComboboxInput
            ref="input"
            :display-value="(inputValue) => inputValue ?? ''"
            :placeholder="label"
          />
          <ComboboxTrigger class="absolute end-0 inset-y-0 flex items-center justify-center px-3">
            <ChevronUpIcon :size="18" v-if="comboBoxOpen" />
            <ChevronDownIcon :size="18" v-else />
          </ComboboxTrigger>
        </div>
      </ComboboxAnchor>

      <ComboboxList class="max-h-[50vh] overflow-auto">
        <ComboboxEmpty v-if="items.length === 0"> No presets found. </ComboboxEmpty>

        <ComboboxGroup v-if="items.length > 0">
          <ComboboxItem
            v-for="item in items"
            :key="item"
            :value="item.toString()"
            class="cursor-pointer"
          >
            {{ item }}
          </ComboboxItem>
        </ComboboxGroup>
      </ComboboxList>

      <!-- Loading indicator -->
      <div v-if="applying">
        <Spinner />
      </div>
    </Combobox>
  </form>
</template>

<script setup lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { useSettingsStore } from '@/stores/settings'
import { LogType } from '@/utils/logging'

import { makeNotification } from '@/utils/notifications'
import { useFocus } from '@vueuse/core'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '../ui/combobox'
import { Spinner } from '../ui/spinner'

let {
  type,
  index = 0,
  toolHeaterIndex = 0,
  label,
  disabled = false,
  controlTools = false,
  controlBeds = false,
  controlChambers = false,
  active = false,
  standby = false,
} = defineProps<{
  type: 'all' | 'tool' | 'spindle' | 'bed' | 'chamber'
  index?: number
  toolHeaterIndex?: number
  label?: string
  disabled?: boolean
  controlTools?: boolean
  controlBeds?: boolean
  controlChambers?: boolean
  active?: boolean
  standby?: boolean
}>()

let comboBoxOpen = ref(false)
let applying = ref(false)
let blurTimer = ref<NodeJS.Timeout | null>(null)
let inputElement = ref<HTMLInputElement | null>(null)
let actualValue = ref(0)
let inputValue = ref('0')
let { t } = useI18n()
let { uiFrozen } = storeToRefs(useRootStore())
let { tools, heat } = storeToRefs(useMachinesModelStore())
let inputRef = useTemplateRef<HTMLElement>('input')
const { focused } = useFocus(inputRef)

watch(focused, (newVal, oldVal) => {
  console.log(newVal)
  console.log(newVal)
  console.log(newVal)
  console.log(newVal)
  console.log(newVal)
  console.log(newVal)
  console.log(newVal)
})

let items = computed(() => {
  if (useSettingsStore().disableAutoComplete) {
    return []
  }

  if (type === 'spindle') {
    return useMachinesSettingsStore().spindleRPM
  }
  const key = active ? 'active' : 'standby'
  if (type === 'all') {
    if (controlBeds) {
      return useMachinesSettingsStore().temperatures.bed[key]
    }
    if (controlChambers) {
      return useMachinesSettingsStore().temperatures.chamber
    }
    return useMachinesSettingsStore().temperatures.tool[key]
  }
  if (type === 'tool') {
    return useMachinesSettingsStore().temperatures.tool[key]
  }
  if (type === 'bed') {
    return useMachinesSettingsStore().temperatures.bed[key]
  }
  if (type === 'chamber') {
    return useMachinesSettingsStore().temperatures.chamber
  }

  console.warn('[control-input] Failed to retrieve temperature presets')
  return []
})

let isValid = computed(() => {
  if (type === 'all' || type === 'spindle') {
    return true
  }
  if (type === 'tool') {
    if (index >= 0 && index < tools.value.length && tools.value[index] !== null) {
      const heater = tools.value[index]!.heaters[toolHeaterIndex]
      return (
        heater >= 0 && heater < heat.value.heaters.length && heat.value.heaters[heater] !== null
      )
    }
  } else if (type === 'bed') {
    return index >= 0 && index < heat.value.bedHeaters.length
  } else if (type === 'chamber') {
    return index >= 0 && index < heat.value.chamberHeaters.length
  }
  return false
})

let currentValue = computed(() => {
  const activeOrStandby = active ? 'active' : 'standby'
  switch (type) {
    case 'all':
      // not applicable
      break

    case 'tool':
      if (index >= 0 && index < tools.value.length && tools.value[index] !== null) {
        const values = tools.value[index]![activeOrStandby]
        if (toolHeaterIndex >= 0 && toolHeaterIndex < values.length) {
          return values[toolHeaterIndex]
        }
      }
      break

    case 'spindle':
      if (index >= 0 && index < tools.value.length && tools.value[index] !== null) {
        return tools.value[index]!.spindleRpm
      }
      break

    case 'bed':
      if (index >= 0 && index < heat.value.bedHeaters.length) {
        const heaterIndex = heat.value.bedHeaters[index]
        if (
          heaterIndex >= 0 &&
          heaterIndex < heat.value.heaters.length &&
          heat.value.heaters[heaterIndex] !== null
        ) {
          return heat.value.heaters[heaterIndex]![activeOrStandby]
        }
      }
      break

    case 'chamber':
      if (index >= 0 && index < heat.value.chamberHeaters.length) {
        const heaterIndex = heat.value.chamberHeaters[index]
        if (
          heaterIndex >= 0 &&
          heaterIndex < heat.value.heaters.length &&
          heat.value.heaters[heaterIndex] !== null
        ) {
          return heat.value.heaters[heaterIndex]![activeOrStandby]
        }
      }
      break

    default:
      const _exhaustiveCheck: never = type
      break
  }
  return 0
})

watch(currentValue, (newVal, oldVal) => {
  if (isFinite(newVal) && actualValue.value !== newVal) {
    actualValue.value = newVal
    if (document.activeElement !== inputElement.value) {
      inputValue.value = newVal.toString()
    }
  }
})
onMounted(() => {
  // inputElement.value = this.$el.querySelector('input')
  actualValue.value = currentValue.value
  inputValue.value = currentValue.value.toString()
})

async function apply() {
  // nextTick(() => (inputRef.value!.isMenuActive = false)) // FIXME There must be a better solution than this

  const value = parseFloat(inputValue.value)
  if (!isFinite(value)) {
    makeNotification(LogType.warning, t('error.enterValidNumber'))
    return
  }

  if (!applying.value) {
    applying.value = true
    try {
      const _inputValue = parseFloat(inputValue.value)
      switch (type) {
        case 'all':
          let code = ''
          if (controlTools) {
            for (const tool of tools.value) {
              if (tool && tool.heaters.length > 0) {
                const temps = tool.heaters.map(() => inputValue.value).join(':')
                code += `M568 P${tool.number} ${active ? 'S' : 'R'}${temps}\n`
              }
            }
          }
          if (controlBeds) {
            for (let i = 0; i < heat.value.bedHeaters.length; i++) {
              const bedHeater = heat.value.bedHeaters[i]
              if (bedHeater >= 0 && bedHeater <= heat.value.heaters.length) {
                code += `M140 P${i} ${active ? 'S' : 'R'}${inputValue.value}\n`
              }
            }
          }
          if (controlChambers) {
            for (let i = 0; i < heat.value.chamberHeaters.length; i++) {
              const chamberHeater = heat.value.chamberHeaters[i]
              if (chamberHeater >= 0 && chamberHeater <= heat.value.heaters.length) {
                code += `M141 P${i} ${active ? 'S' : 'R'}${inputValue.value}\n`
              }
            }
          }
          if (code !== '') {
            await useMachinesStore().sendCode(code)
          }
          actualValue.value = _inputValue
          break

        case 'tool':
          if (_inputValue >= -273.15 && _inputValue <= 1999) {
            const currentTemps = tools.value[index]![active ? 'active' : 'standby']
            const newTemps = currentTemps
              .map((temp, i) => (i === toolHeaterIndex ? inputValue.value : temp))
              .join(':')
            await useMachinesStore().sendCode(`M568 P${index} ${active ? 'S' : 'R'}${newTemps}`)
          }
          break

        case 'spindle':
          await useMachinesStore().sendCode(`M568 P${index} F${inputValue.value}`)
          break

        case 'bed':
          if (_inputValue >= -273.15 && _inputValue <= 1999) {
            await useMachinesStore().sendCode(
              `M140 P${index} ${active ? 'S' : 'R'}${inputValue.value}`,
            )
          }
          break

        case 'chamber':
          if (_inputValue >= -273.15 && _inputValue <= 1999) {
            useMachinesStore().sendCode(`M141 P${index} ${active ? 'S' : 'R'}${inputValue.value}`)
          }
          break

        default:
          const _exhaustiveCheck: never = type
          console.warn('[control-input] Invalid target for control-input')
          break
      }
    } catch (e) {
      // should be handled before we get here
      console.warn(e)
    }
    applying.value = false
  }
}
function blur() {
  if (useRootStore().bottomMargin > 0) {
    if (!blurTimer.value) {
      // Do not update the input value before a potentially installed on-screen keyboard is hidden.
      // This work-around is necessary because the input field loses focus every time a button is pressed
      blurTimer.value = setTimeout(checkAfterBlur, 500)
    }
  } else {
    inputValue.value = actualValue.value.toString()
  }
}
function checkAfterBlur() {
  blurTimer.value = null
  blur()
}
async function change(value: string | number | bigint | Record<string, any> | null) {
  // Note that value is of type String when a user enters a value and then leaves it without confirming...
  if (value === null || typeof value === 'bigint' || typeof value === 'object') {
    return
  }
  if (typeof value === 'number') {
    inputValue.value = value.toString()
    await apply()
  } else {
    inputValue.value = value
  }
}
</script>
