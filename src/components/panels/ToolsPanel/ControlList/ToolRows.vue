<template>
  <tbody>
    <template v-if="toolsToDisplay.length > 0">
      <template v-for="(tool, toolIndex) in toolsToDisplay">
        <!-- Tool -->
        <tr
          v-for="(toolHeater, toolHeaterIndex) in getToolHeaters(tool)"
          :key="`tool-${tool.number}-${toolHeaterIndex}`"
          :class="tool.number === currentTool ? selectedToolClass : ''"
        >
          <!-- Tool Name -->
          <th
            v-if="toolHeaterIndex === 0"
            :rowspan="Math.max(1, tool.heaters.length)"
            class="pl-2"
            :class="{ 'pt-2 pb-2': !tool.heaters.length && !toolHeater }"
          >
            <!-- Tool Name or Dropdown -->
            <a
              v-if="!isToolCollapsed(tool)"
              href="javascript:void(0)"
              :class="{ disabled: disabled }"
              @click="toolClick(tool)"
            >
              <v-progress-circular
                v-if="tool === busyTool"
                indeterminate
                color="primary"
                :size="14"
              />
              <v-icon v-if="getToolIcon(tool)" small>{{ getToolIcon(tool) }}</v-icon>
              {{ tool.name || $t('panel.tools.tool', [tool.number]) }}
            </a>
            <v-menu v-else offset-y auto>
              <template #activator="{ on }">
                <a href="javascript:void(0)" v-on="on">
                  <v-progress-circular
                    v-if="isCollapsedToolBusy(tool)"
                    indeterminate
                    color="primary"
                    :size="14"
                  />
                  <v-icon v-if="getToolIcon(tool)" small>{{ getToolIcon(tool) }}</v-icon>
                  {{ tool.name || $t('panel.tools.tool', [tool.number]) }}
                  <v-icon small>mdi-menu-down</v-icon>
                </a>
              </template>

              <v-list>
                <v-list-item
                  v-for="otherTool in getCollapsedTools(tool)"
                  :key="otherTool.number"
                  @click="toolClick(otherTool)"
                >
                  <v-icon v-if="getToolIcon(tool)" class="mr-1">
                    {{ getToolIcon(tool) }}
                  </v-icon>
                  {{
                    `${otherTool.name} (T${otherTool.number})` ||
                    $t('panel.tools.tool', [otherTool.number])
                  }}
                </v-list-item>
              </v-list>
            </v-menu>

            <br />
            <span class="font-weight-regular caption">
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

                  <v-list>
                    <v-list-item @click="showFilamentDialog(tool, true)">
                      <v-icon class="mr-1">mdi-swap-vertical</v-icon>
                      {{ $t('panel.tools.changeFilament') }}
                    </v-list-item>
                    <v-list-item @click="showFilamentDialog(tool, false)">
                      <v-icon class="mr-1">mdi-pencil</v-icon>
                      {{ $t('panel.tools.reassignFilament') }}
                    </v-list-item>
                    <v-list-item @click="unloadFilament(tool)">
                      <v-icon class="mr-1">mdi-arrow-up</v-icon>
                      {{ $t('panel.tools.unloadFilament') }}
                    </v-list-item>
                  </v-list>
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
          </th>

          <template v-if="!toolHeater && getSpindle(tool)">
            <!-- Spindle Name -->
            <td>
              <template v-if="tool.number === currentTool">
                <v-row dense>
                  <v-col>
                    <code-btn code="M4" no-wait small>
                      <v-icon>mdi-rotate-left</v-icon>
                    </code-btn>
                    <code-btn code="M3" no-wait small>
                      <v-icon>mdi-rotate-right</v-icon>
                    </code-btn>
                  </v-col>
                </v-row>
                <v-row dense>
                  <v-col>
                    <code-btn code="M5" no-wait small>
                      <v-icon>mdi-stop</v-icon>
                    </code-btn>
                  </v-col>
                </v-row>
              </template>
            </td>

            <!-- Current RPM -->
            <td class="text-center">
              {{ $display(getSpindleSpeed(tool), 0, $t('generic.rpm')) }}
            </td>

            <!-- Active RPM -->
            <td>
              <control-input type="spindle" :index="tool.number" active />
            </td>

            <!-- Standby RPM -->
            <td>
              <!-- unused -->
            </td>
          </template>
          <template v-else>
            <!-- Heater Name -->
            <th>
              <template v-if="toolHeater">
                <a
                  href="javascript:void(0)"
                  :class="getHeaterClasses(tool.heaters[toolHeaterIndex])"
                  @click="toolHeaterClick(tool, toolHeater)"
                >
                  {{ getHeaterName(toolHeater, tool.heaters[toolHeaterIndex]) }}
                </a>
                <template v-if="toolHeater.state !== null">
                  <br />
                  <span class="font-weight-regular caption">
                    {{ $t(`generic.heaterStates.${toolHeater.state}`) }}
                  </span>
                </template>
              </template>
              <span v-else>
                {{ $t('generic.noValue') }}
              </span>
            </th>

            <!-- Heater value -->
            <td>
              {{ getHeaterValue(toolHeater) }}
            </td>

            <!-- Heater active -->
            <td class="pl-2 pr-1">
              <control-input
                :disabled="isToolBusy(tool)"
                type="tool"
                :index="tool.number"
                :tool-heater-index="toolHeaterIndex"
                active
              />
            </td>

            <!-- Heater standby -->
            <td class="pl-1 pr-2">
              <control-input
                :disabled="isToolBusy(tool)"
                type="tool"
                :index="tool.number"
                :tool-heater-index="toolHeaterIndex"
                standby
              />
            </td>
          </template>

          <filament-dialog
            v-if="toolIndex === 0"
            v-model:shown="filamentDialogShown"
            :run-macros="filamentRunMacros"
            :tool="filamentDialogTool"
          />
        </tr>

        <!-- Divider -->
        <tr v-if="toolIndex < toolsToDisplay.length - 1" :key="`div - tool - ${toolIndex} `">
          <td colspan="5">
            <v-divider />
          </td>
        </tr>
      </template>
    </template>
  </tbody>
</template>

<script setup lang="ts">
import { Heater, HeaterState, MachineStatus, SpindleState, Tool } from '@duet3d/objectmodel'
import { computed, ref } from 'vue'

import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { useMachinesStore } from '@/stores/machines'
import { useSettingsStore } from '@/stores/settings'
import { getHeaterColor } from '@/utils/colors'
import { displaySensorValue } from '@/utils/display'
import { DisconnectedError, getErrorMessage } from '@/utils/errors'
import { log, LogType } from '@/utils/logging'
import { useI18n } from 'vue-i18n'

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
const selectedToolClass = computed(() =>
  useSettingsStore().darkTheme ? 'grey darken-3' : 'blue lighten-5',
)

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
        return 'mdi-printer-3d-nozzle-alert'
      }
      return 'mdi-printer-3d-nozzle'
    }
    if (tool.spindle >= 0) {
      return 'mdi-saw-blade'
    }
    if (tool.name.toLowerCase().includes('laser')) {
      // TODO the object model does not report if a laser is mapped to a tool
      return 'mdi-star-four-points-circle-outline'
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
  const classes = [getHeaterColor(heater)]
  if (disabled.value) {
    classes.push('disabled-heater')
  }
  return classes
}

function getHeaterName(heater: Heater | null, heaterIndex: number) {
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

function getHeaterValue(heater: Heater | null) {
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

async function toolHeaterClick(tool: Tool, heater: Heater) {
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
