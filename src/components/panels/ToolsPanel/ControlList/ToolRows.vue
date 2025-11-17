<template>
  <template v-if="toolsToDisplay.length > 0">
    <template v-for="(tool, toolIndex) in toolsToDisplay">
      <!-- Tool -->
      <template
        v-for="(toolHeater, toolHeaterIndex) in getToolHeaters(tool)"
        :key="`tool-${tool.number}-${toolHeaterIndex}`"
      >
        <!-- Tool Name -->
        <div v-if="toolHeaterIndex === 0" class="flex flex-col justify-center w-full">
          <!-- Tool Name or Dropdown -->
          <a
            v-if="!isToolCollapsed(tool)"
            href="javascript:void(0)"
            class="flex flex-row gap-1 items-center justify-center"
            :class="{ disabled: disabled }"
            @click="toolClick(tool)"
          >
            <Spinner v-if="tool === busyTool" indeterminate />
            <component :is="getToolIcon(tool)" :size="14" />
            <div class="text-nowrap">
              {{ tool.name || $t('panel.tools.tool', [tool.number]) }}
            </div>
          </a>
          <v-menu v-else offset-y auto>
            <template #activator="{ on }">
              <a href="javascript:void(0)" v-on="on" class="flex flex-row gap-2 items-center">
                <Spinner v-if="isCollapsedToolBusy(tool)" indeterminate />
                <component :is="getToolIcon(tool)" :size="14" />
                <span class="text-nowrap">
                  {{ tool.name || $t('panel.tools.tool', [tool.number]) }}
                </span>
                <v-icon small>mdi-menu-down</v-icon>
              </a>
            </template>

            <div
              v-for="otherTool in getCollapsedTools(tool)"
              :key="otherTool.number"
              @click="toolClick(otherTool)"
              class="flex flex-col"
            >
              <div>
                <component :is="getToolIcon(tool)" :size="14" />
                <span class="text-nowrap">
                  {{
                    `${otherTool.name} (T${otherTool.number})` ||
                    $t('panel.tools.tool', [otherTool.number])
                  }}
                </span>
              </div>
            </div>
          </v-menu>

          <span class="text-xs text-nowrap">
            T{{ tool.number }}

            <template v-if="canLoadFilament(tool)">
              -
              <v-menu v-if="getFilament(tool)" offset-y auto :disabled="disabled">
                <template #activator="{ on }">
                  <a
                    href="javascript:void(0)"
                    class="font-weight-regular"
                    :class="{ disabled: disabled }"
                    v-on="on"
                  >
                    {{ getFilament(tool) }}
                  </a>
                </template>

                <div class="flex flex-col">
                  <div
                    @click="showFilamentDialog(tool, true)"
                    class="flex flex-row gap-2 items-center"
                  >
                    <ArrowDownUpIcon :size="18" />
                    {{ $t('panel.tools.changeFilament') }}
                  </div>
                  <div
                    @click="showFilamentDialog(tool, false)"
                    class="flex flex-row gap-2 items-center"
                  >
                    <PencilIcon :size="18" />
                    {{ $t('panel.tools.reassignFilament') }}
                  </div>
                  <div @click="unloadFilament(tool)" class="flex flex-row gap-2 items-center">
                    <ArrowUpIcon :size="18" />
                    {{ $t('panel.tools.unloadFilament') }}
                  </div>
                </div>
              </v-menu>
              <a
                v-else
                href="javascript:void(0)"
                :class="{ disabled: disabled }"
                @click="showFilamentDialog(tool, true)"
              >
                {{ $t('panel.tools.loadFilament') }}
              </a>
            </template>
          </span>
        </div>

        <template v-if="!toolHeater && getSpindle(tool)">
          <!-- Spindle Name -->
          <div>
            <template v-if="tool.number === currentTool">
              <div class="flex flex-col">
                <CodeBtn code="M4" no-wait small>
                  <RotateCcwIcon :size="18" />
                </CodeBtn>
                <CodeBtn code="M3" no-wait small>
                  <RotateCwIcon :size="18" />
                </CodeBtn>
              </div>

              <CodeBtn code="M5" no-wait small>
                <SquareIcon :size="18" />
              </CodeBtn>
            </template>
          </div>

          <!-- Current RPM -->
          <td class="text-center">
            {{ display(getSpindleSpeed(tool), 0, $t('generic.rpm')) }}
          </td>

          <!-- Active RPM -->
          <td>
            <ControlInput type="spindle" :index="tool.number" active />
          </td>

          <!-- Standby RPM -->
          <td>
            <!-- unused -->
          </td>
        </template>
        <template v-else>
          <!-- Heater Name -->
          <div class="text-center flex flex-col justify-center">
            <template v-if="toolHeater">
              <a
                class="text-nowrap font-semibold"
                :style="{ color: getHeaterClasses(tool.heaters[toolHeaterIndex]) }"
                href="javascript:void(0)"
                @click="toolHeaterClick(tool, toolHeater)"
              >
                {{ getHeaterName(toolHeater, tool.heaters[toolHeaterIndex]) }}
              </a>

              <span class="text-xs" v-if="toolHeater.state !== null">
                {{ $t(`generic.heaterStates.${toolHeater.state}`) }}
              </span>
            </template>
            <span v-else>
              {{ $t('generic.noValue') }}
            </span>
          </div>

          <!-- Heater value -->
          <div class="text-center flex flex-col justify-center">
            {{ getHeaterValue(toolHeater) }}
          </div>

          <!-- Heater active -->
          <ControlInput
            :disabled="isToolBusy(tool)"
            type="tool"
            :index="tool.number"
            :tool-heater-index="toolHeaterIndex"
            active
          />

          <!-- Heater standby -->

          <ControlInput
            :disabled="isToolBusy(tool)"
            type="tool"
            :index="tool.number"
            :tool-heater-index="toolHeaterIndex"
            standby
          />
        </template>

        <FilamentDialog
          class="col-span-full"
          v-if="toolIndex === 0"
          v-model:shown="filamentDialogShown"
          :run-macros="filamentRunMacros"
          :tool="filamentDialogTool ?? undefined"
        />
      </template>

      <!-- Divider -->
      <div
        class="col-span-full"
        v-if="toolIndex < toolsToDisplay.length - 1"
        :key="`div - tool - ${toolIndex} `"
      >
        <Separator />
      </div>
    </template>
  </template>
</template>

<script setup lang="ts">
import { Heater, HeaterState, MachineStatus, SpindleState, Tool } from '@duet3d/objectmodel'
import { computed, ref } from 'vue'

import CodeBtn from '@/components/buttons/CodeBtn.vue'
import ControlInput from '@/components/inputs/ControlInput.vue'
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { useMachinesStore } from '@/stores/machines'
import { displaySensorValue } from '@/utils/display'
import { DisconnectedError, getErrorMessage } from '@/utils/errors'
import { log, LogType } from '@/utils/logging'
import {
  ArrowDownUpIcon,
  ArrowUpIcon,
  createLucideIcon,
  PencilIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SparkleIcon,
  SquareIcon,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

import FilamentDialog from '@/components/dialogs/FilamentDialog.vue'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { getHeaterColor } from '@/utils/colors'
import { display } from '@/utils/display'
import { WritableObjectDeep } from 'type-fest/source/writable-deep'
const emit = defineEmits<{
  (e: 'resetHeaterFault', heater: number): void
}>()

const disabled = computed<boolean>(
  () =>
    useRootStore().uiFrozen ||
    [
      MachineStatus.pausing,
      MachineStatus.processing,
      MachineStatus.resuming,
      MachineStatus.simulating,
    ].includes(useMachinesModelStore().state.status),
)

// Tool display
const toolsToDisplay = computed<Array<Tool>>(() => {
  if (!useMachinesSettingsStore().groupTools) {
    return useMachinesModelStore().tools.filter((tool) => tool !== null) as Array<Tool>
  }

  const tools: Array<Tool> = []
  for (const item of useMachinesModelStore().tools) {
    if (item !== null) {
      let equalToolFound = false

      for (let i = 0; i < tools.length; i++) {
        const tool = tools[i]
        if (
          item.extruders.length === tool.extruders.length &&
          item.extruders.every((extruder, index) => extruder === tool.extruders[index]) &&
          item.heaters.length === tool.heaters.length &&
          item.heaters.every((heater, index) => heater === tool.heaters[index]) &&
          item.offsets.length === tool.offsets.length &&
          item.offsets.every((offset, index) => offset === tool.offsets[index]) &&
          item.spindle === tool.spindle
        ) {
          // Tool is identical
          equalToolFound = true
          if (item.number === useMachinesModelStore().state.currentTool) {
            // If another tool is selected, prefer the displayed tool
            tools[i] = item
          }
        }
      }

      if (!equalToolFound) {
        tools.push(item)
      }
    }
  }
  return tools
})

const currentTool = computed(() => useMachinesModelStore().state.currentTool),
  busyTool = ref<Tool | null>(null)

function isToolCollapsed(tool: Tool) {
  if (toolsToDisplay.value.length < useMachinesModelStore().tools.length) {
    for (const item of useMachinesModelStore().tools) {
      if (item !== null && item !== tool) {
        if (
          item.extruders.length === tool.extruders.length &&
          item.extruders.every((extruder, index) => extruder === tool.extruders[index]) &&
          item.heaters.length === tool.heaters.length &&
          item.heaters.every((heater, index) => heater === tool.heaters[index]) &&
          item.offsets.length === tool.offsets.length &&
          item.offsets.every((offset, index) => offset === tool.offsets[index]) &&
          item.spindle === tool.spindle
        ) {
          return true
        }
      }
    }
  }
  return false
}

function getCollapsedTools(tool: Tool) {
  const tools: Array<Tool> = []
  for (const item of useMachinesModelStore().tools) {
    if (
      item !== null &&
      item.extruders.length === tool.extruders.length &&
      item.extruders.every((extruder, index) => extruder === tool.extruders[index]) &&
      item.heaters.length === tool.heaters.length &&
      item.heaters.every((heater, index) => heater === tool.heaters[index]) &&
      item.offsets.length === tool.offsets.length &&
      item.offsets.every((offset, index) => offset === tool.offsets[index]) &&
      item.spindle === tool.spindle
    ) {
      // Tool is identical
      tools.push(item)
    }
  }
  return tools
}

function isCollapsedToolBusy(tool: Tool) {
  return getCollapsedTools(tool).includes(busyTool.value as Tool)
}

function isToolBusy(tool: Tool) {
  return isToolCollapsed(tool) ? isCollapsedToolBusy(tool) : busyTool.value === tool
}

function getToolIcon(tool: Tool) {
  if (tool !== null) {
    if (tool.extruders.length > 0) {
      if (
        useMachinesModelStore().heat.heaters.some(
          (heater, heaterIndex) =>
            heater !== null &&
            heater.state === HeaterState.fault &&
            tool.heaters.includes(heaterIndex),
        )
      ) {
        return Printer3dNozzleAlertIcon
      }
      return Printer3dNozzleIcon
    }
    if (tool.spindle >= 0) {
      return SawBladeIcon
    }
    if (tool.name.toLowerCase().includes('laser')) {
      // TODO the object model does not report if a laser is mapped to a tool
      return SparkleIcon
    }
  }
  return null
}

// Tool caption
const toolChangeParameter = computed<string>(() => useMachinesSettingsStore().toolChangeParameter())

async function toolClick(tool: Tool) {
  if (disabled.value || busyTool.value !== null) {
    return
  }

  busyTool.value = tool
  try {
    if (useMachinesModelStore().state.currentTool === tool.number) {
      // Deselect current tool
      await useMachinesStore().sendCode('T-1' + toolChangeParameter.value)
    } else {
      // Select new tool
      await useMachinesStore().sendCode(`T${tool.number}${toolChangeParameter.value}`)
    }
  } catch (e) {
    if (!(e instanceof DisconnectedError)) {
      log(LogType.error, getErrorMessage(e))
    }
  }
  busyTool.value = null
}

// Filament management
const loadingFilament = ref(false),
  filamentDialogShown = ref(false),
  filamentRunMacros = ref(true),
  filamentDialogTool = ref<Tool | null>(null)

function getFilament(tool: Tool) {
  if (
    tool.filamentExtruder >= 0 &&
    tool.filamentExtruder < useMachinesModelStore().move.extruders.length
  ) {
    return useMachinesModelStore().move.extruders[tool.filamentExtruder].filament
  }
  return null
}

function canLoadFilament(tool: Tool) {
  return (
    tool.filamentExtruder >= 0 &&
    tool.filamentExtruder < useMachinesModelStore().move.extruders.length
  )
}

async function showFilamentDialog(tool: Tool, runMacros: boolean) {
  if (busyTool.value !== null || disabled.value) {
    return
  }

  filamentDialogTool.value = tool
  filamentRunMacros.value = runMacros
  filamentDialogShown.value = true
}

async function unloadFilament(tool: Tool) {
  if (busyTool.value !== null || disabled.value) {
    return
  }

  busyTool.value = tool
  try {
    let code = ''
    if (currentTool.value !== tool.number) {
      code = `T${tool.number}\n`
    }
    code += 'M702'
    await useMachinesStore().sendCode(code)
  } finally {
    busyTool.value = null
  }
}

// Tool heaters
function getToolHeaters(tool: Tool) {
  const heaters = useMachinesModelStore().heat.heaters
  const toolHeaters = tool.heaters
    .filter(
      (heaterIndex) =>
        heaterIndex >= 0 && heaterIndex < heaters.length && heaters[heaterIndex] !== null,
    )
    .map((heaterIndex) => heaters[heaterIndex])
  return toolHeaters.length > 0 ? toolHeaters : [null]
}

function getHeaterClasses(heater: number) {
  return getHeaterColor(heater, getComputedStyle(document.body))
}

function getHeaterName(heater: Heater | WritableObjectDeep<Heater> | null, heaterIndex: number) {
  if (
    heater !== null &&
    heater.sensor >= 0 &&
    heater.sensor < useMachinesModelStore().sensors.analog.length
  ) {
    const sensor = useMachinesModelStore().sensors.analog[heater.sensor]
    if (sensor !== null && sensor.name) {
      const matches = /(.*)\[(.*)\]$/.exec(sensor.name)
      if (matches) {
        return matches[1]
      }
      return sensor.name
    }
  }
  return useI18n().t('panel.tools.heater', [heaterIndex])
}

function getHeaterValue(heater: Heater | WritableObjectDeep<Heater> | null) {
  if (
    heater !== null &&
    heater.sensor >= 0 &&
    heater.sensor < useMachinesModelStore().sensors.analog.length
  ) {
    const sensor = useMachinesModelStore().sensors.analog[heater.sensor]
    if (sensor !== null) {
      return displaySensorValue(sensor)
    }
  }
  return useI18n().t('generic.noValue')
}

async function toolHeaterClick(tool: Tool, heater: Heater | WritableObjectDeep<Heater>) {
  if (disabled.value || isToolBusy(tool)) {
    return
  }

  switch (heater.state) {
    case HeaterState.off: // Off -> Active
      await useMachinesStore().sendCode(`M568 P${tool.number} A2`)
      break

    case HeaterState.standby: // Standby -> Off
      await useMachinesStore().sendCode(`M568 P${tool.number} A0`)
      break

    case HeaterState.active: // Active -> Standby
      await useMachinesStore().sendCode(`M568 P${tool.number} A1`)
      break

    case HeaterState.fault: // Fault -> Ask for reset
      emit('resetHeaterFault', useMachinesModelStore().heat.heaters.indexOf(heater))
      break
  }
}

// Spindles
function getSpindle(tool: Tool) {
  return tool.spindle >= 0 && tool.spindle < useMachinesModelStore().spindles.length
    ? useMachinesModelStore().spindles[tool.spindle]
    : null
}

function getSpindleSpeed(tool: Tool) {
  const spindle = getSpindle(tool)
  return spindle !== null && spindle.current !== null
    ? spindle.state === SpindleState.reverse
      ? -spindle.current
      : spindle.current
    : 0
}

const Printer3dNozzleIcon = createLucideIcon('printer3dNozzleIcon', [
  [
    'path',
    {
      d: 'M10 22H2V20H10A1 1 0 0 0 11 19V18H13V19A3 3 0 0 1 10 22Z',
      key: '1jrua0',
    },
  ],
  [
    'path',
    {
      d: 'M7 2H17V8H19V13H16.5L13 17H11L7.5 13H5V8H7V2',
      key: 'l94za0',
    },
  ],
])

const Printer3dNozzleAlertIcon = createLucideIcon('printer3dNozzleAlertIcon', [
  [
    'path',
    {
      d: 'M10 22H2V20H10C10.6 20 11 19.5 11 19V18H13V19C13 20.7 11.7 22 10 22',
      key: 'rkwwhn',
    },
  ],
  [
    'path',
    {
      d: 'M21 13V7H23V13H21',
      key: '11liqt',
    },
  ],
  [
    'path',
    {
      d: 'M21 17V15H23V17H21Z',
      key: '1sp8lb',
    },
  ],
  [
    'path',
    {
      d: 'M7 2H17V8H19V13H16.5L13 17H11L7.5 13H5V8H7V2',
      key: 'l94za0',
    },
  ],
])

const SawBladeIcon = createLucideIcon('sawBladeIcon', [
  [
    'path',
    {
      d: 'M14 12A2 2 0 0 0 12 10A2 2 0 0 0 10 12A2 2 0 0 0 12 14A2 2 0 0 0 14 12Z',
      key: 'zkzy97',
    },
  ],
  [
    'path',
    {
      d: 'M20 15C20 15 18.6 16.3 21.1 17L18.3 19.8H15.5C15.5 19.8 13.6 19.7 15 22H11L9 20C9 20 7.7 18.6 7 21.1L4.2 18.3V15.5C4.2 15.5 4.3 13.6 2 15V11L4 9C4 9 5.4 7.7 2.8 7.1L5.6 4.2H8.5C8.5 4.2 10.4 4.3 9 2H13L15 4C15 4 16.3 5.4 17 2.8L19.8 5.6V8.5C19.8 8.5 19.7 10.4 22 9V13L20 15',
      key: '1oalqn',
    },
  ],
])
</script>

<style scoped>
.disabled {
  color: inherit;
  cursor: default;
}

.disabled-heater {
  cursor: default;
}

.disabled:hover,
.disabled-heater {
  text-decoration: none;
}
</style>
