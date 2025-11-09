import ObjectModel, {
  Axis,
  AxisLetter,
  Board,
  Extruder,
  Fan,
  Heat,
  Heater,
  initCollection,
  initObject,
  KinematicsName,
  MachineStatus,
  Move,
  MoveCompensationType,
  Network,
  Probe,
  Sensors,
  State,
  Tool,
} from '@duet3d/objectmodel'

import { translateResponse } from '@/i18n/utils'
import { isPaused, isPrinting } from '@/utils/enums'
import patch from '@/utils/patch'

import { defineStore } from 'pinia'
import { WritableDeep } from 'type-fest'
import { useRootStore } from '.'
import { defaultMachine } from './misc'

/**
 * Default object model used to display initial values.
 * This does not need to be reactive because it is not expected to change
 */
export const DefaultModel = initObject(ObjectModel, {
  boards: initCollection(Board, [{}]),
  fans: initCollection(Fan, [{}]),
  heat: initObject(Heat, {
    bedHeaters: [0],
    heaters: initCollection(Heater, [{}, {}]),
  }),
  move: initObject(Move, {
    axes: initCollection(Axis, [
      {
        letter: AxisLetter.X,
        homed: true,
        machinePosition: 0,
        userPosition: 0,
      },
      {
        letter: AxisLetter.Y,
        homed: true,
        machinePosition: 0,
        userPosition: 0,
      },
      {
        letter: AxisLetter.Z,
        homed: true,
        machinePosition: 0,
        userPosition: 0,
      },
    ]),
    extruders: initCollection(Extruder, [{}]),
  }),
  network: initObject(Network, {
    name: 'Duet Web Control',
  }),
  sensors: initObject(Sensors, {
    probes: initCollection(Probe, [{}]),
  }),
  state: initObject(State, {
    status: MachineStatus.disconnected,
  }),
  tools: initCollection(Tool, [
    {
      number: 0,
      active: [0],
      standby: [0],
      heaters: [1],
      extruders: [0],
      spindle: -1,
      spindleRpm: 0,
    },
  ]),
})

export const useMachinesModelStore = defineStore('machinesModel', {
  state: (): Record<string, WritableDeep<ObjectModel>> => ({
    [defaultMachine]: DefaultModel,
  }),
  getters: {
    // Remove any getters that return state under the same name (eg. firstName: (state) => state.firstName), these are not necessary as you can access any state directly from the store instance
    // If you need to access other getters, they are on this instead of using the second argument. Remember that if you are using this then you will have to use a regular function instead of an arrow function. Also note that you will need to specify a return type because of TS limitations, see here for more details
    // If using rootState or rootGetters arguments, replace them by importing the other store directly, or if they still exist in Vuex then access them directly from Vuex
    boards: (state) => state[useRootStore().selectedMachine].boards,
    directories: (state) => state[useRootStore().selectedMachine].directories,
    fans: (state) => state[useRootStore().selectedMachine].fans,
    global: (state) => state[useRootStore().selectedMachine].global,
    heat: (state) => state[useRootStore().selectedMachine].heat,
    inputs: (state) => state[useRootStore().selectedMachine].inputs,
    job: (state) => state[useRootStore().selectedMachine].job,
    ledStrips: (state) => state[useRootStore().selectedMachine].ledStrips,
    limits: (state) => state[useRootStore().selectedMachine].limits,
    messages: (state) => state[useRootStore().selectedMachine].messages,
    move: (state) => state[useRootStore().selectedMachine].move,
    network: (state) => state[useRootStore().selectedMachine].network,
    plugins: (state) => state[useRootStore().selectedMachine].plugins,
    sbc: (state) => state[useRootStore().selectedMachine].sbc,
    sensors: (state) => state[useRootStore().selectedMachine].sensors,
    spindles: (state) => state[useRootStore().selectedMachine].spindles,
    state: (state) => state[useRootStore().selectedMachine].state,
    tools: (state) => state[useRootStore().selectedMachine].tools,
    volumes: (state) => state[useRootStore().selectedMachine].volumes,
    visibleAxes: (state) => state[useRootStore().selectedMachine].move.axes.filter((axis) => axis.visible) as Axis[],
    isDelta: (state) => [KinematicsName.delta, KinematicsName.rotaryDelta].includes(
            state[useRootStore().selectedMachine].move.kinematics.name,
    ),
    unhomedAxes: (state) => state[useRootStore().selectedMachine].move.axes.filter(
        (axis) => axis.visible && !axis.homed,
    ) as Axis[],
    workplaceNumber: (state) => state[useRootStore().selectedMachine].move.workplaceNumber,
    isCompensationEnabled: (state) => state[useRootStore().selectedMachine].move.compensation.type !== MoveCompensationType.none,
    compensationType: (state) => state[useRootStore().selectedMachine].move.compensation.type,
    jobProgress: (state) => {
      let machineName = useRootStore().selectedMachine
      if (isPrinting(state[machineName].state.status)) {
        if (
          !isPaused(state[machineName].state.status) &&
          state[machineName].state.status !== MachineStatus.simulating &&
          state[machineName].move.extruders.length > 0 &&
          state[machineName].job.file !== null &&
          state[machineName].job.file.filament.length > 0
        ) {
          // Get the total amount of filament extruded (according to the slicer)
          let totalRawExtruded = 0
          for (const extruder of state[machineName].move.extruders) {
            totalRawExtruded += extruder.rawPosition
          }

          // Compute the progress according to the filamet usage
          const totalFilamentRequired = state[machineName].job.file.filament.reduce((a, b) => a + b)
          if (totalFilamentRequired > 0) {
            // Limit the maximum in case the user put extra extrusions in the start/end G-code
            return Math.min(totalRawExtruded / totalFilamentRequired, 1)
          }
        }
        // return getters.fractionPrinted
        return 0
      }
      return state[machineName].job.lastFileName ? 1 : 0
    },
  },
  actions: {
    // Convert actions
    // Remove the first context argument from each action. Everything should be accessible from this instead
    // If using other stores either import them directly or access them on Vuex, the same as for getters
    currentTool() {
      let machineName = useRootStore().selectedMachine
      if (
        this[machineName].state.currentTool >= 0 &&
        this[machineName].state.currentTool < this[machineName].tools.length
      ) {
        return this[machineName].tools[this[machineName].state.currentTool]
      }
      return null
    },
    fractionPrinted() {
      let machineName = useRootStore().selectedMachine
      if (
        this[machineName].job.file &&
        this[machineName].job.filePosition !== null &&
        this[machineName].job.file.size > 0
      ) {
        return (
          (this[machineName].job.filePosition as number) /
          (this[machineName].job.file.size as number)
        )
      }
      return 0
    },
    minHeaterTemperature() {
      let machineName = useRootStore().selectedMachine
      let minTemp: number | null = null
      for (const heater of this[machineName].heat.heaters) {
        if (heater !== null && heater.min > -273 && (minTemp === null || heater.min < minTemp)) {
          minTemp = heater.min
        }
      }
      return minTemp
    },
    maxHeaterTemperature() {
      let machineName = useRootStore().selectedMachine
      let maxTemp: number | null = null
      for (const heater of this[machineName].heat.heaters) {
        if (heater !== null && (maxTemp === null || heater.max > maxTemp)) {
          maxTemp = heater.max
        }
      }
      return maxTemp
    },
    

    // Convert mutations
    // - Mutations do not exist any more. These can be converted to actions instead, or you can just assign directly to the store within your components (eg. userStore.firstName = 'First')
    // - If converting to actions, remove the first state argument and replace any assignments with this instead
    // - A common mutation is to reset the state back to its initial state. This is built in functionality with the store's $reset method. Note that this functionality only exists for option stores.
    // TODO I want to use deep partial, but its again ruining types
    update(data: Partial<ObjectModel>) {
      // Check for i18n actions
      if (data.state instanceof Object) {
        if (typeof data.state.displayMessage === 'string') {
          data.state.displayMessage = translateResponse(data.state.displayMessage)
        }
        if (data.state.messageBox instanceof Object) {
          if (typeof data.state.messageBox.message === 'string') {
            data.state.messageBox.message = translateResponse(data.state.messageBox.message)
          }
          if (typeof data.state.messageBox.title === 'string') {
            data.state.messageBox.title = translateResponse(data.state.messageBox.title)
          }
        }
      }

      // It may be necessary to upgrade to Vue 3 sooner than expected, because it does not suffer from the same limitations as Vue 2
      for (const key of Object.keys(data)) {
        if (key === 'global') {
          ;(this[useRootStore().selectedMachine] as WritableDeep<ObjectModel>).global = data.global!
        } else if (key === 'job') {
          patch(this[useRootStore().selectedMachine].job, data.job)
          if (data.job?.file && data.job.file.customInfo !== undefined) {
            ;(
              this[useRootStore().selectedMachine] as WritableDeep<ObjectModel>
            ).job!.file!.customInfo = data.job.file.customInfo
          }
        } else if (key === 'plugins') {
          this[useRootStore().selectedMachine].plugins = data.plugins!
        } else if (key === 'sbc' && this[useRootStore().selectedMachine].sbc === null) {
          this[useRootStore().selectedMachine].sbc = data.sbc ?? null
        } else {
          patch((this[useRootStore().selectedMachine] as any)[key], data[key])
        }
      }
    },
  },
})
