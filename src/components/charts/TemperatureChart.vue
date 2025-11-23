<template>
  <CardContent class="h-full w-full" ref="card">
    <!-- TODO changing from light->dark mode won't update the dataset colours, the dataset needs to be recreated. cba at the moment -->
    <Line :options="chartOptions" :data="chartData" class="w-full h-full"
      >Failed to render line chart</Line
    >
  </CardContent>
  <CardFooter class="flex flex-row mx-auto gap-2">
    <Badge
      v-for="series in temps.filter((dataset) => dataset.showLine)"
      :key="series.index"
      :style="{ background: series.borderColor }"
      :class="series.hidden ? 'opacity-15' : 'opacity-100'"
      class="cursor-pointer"
      @click="
        () => {
          series.hidden = !series.hidden
          trigger()
        }
      "
      >{{ series.label }}</Badge
    >
  </CardFooter>
  <!-- {{ cardRef!.class.style.getPropertyValue('--heater-1') }} -->
</template>

<script setup lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { useSettingsStore } from '@/stores/settings'
import { AnalogSensor } from '@duet3d/objectmodel'
import {
  ChartData,
  Chart as ChartJS,
  ChartOptions,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

import { useMachinesSamplesStore } from '@/stores/machineSamples'
import { getRealHeaterColor } from '@/utils/colors'
import { watchTriggerable } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Line } from 'vue-chartjs'
import { useI18n } from 'vue-i18n'
import { Badge } from '../ui/badge'
import { CardContent, CardFooter } from '../ui/card'

let { t, locale } = useI18n()

let { darkTheme } = storeToRefs(useSettingsStore())
let { selectedMachine } = storeToRefs(useRootStore())
let { hasTemperaturesToDisplay } = storeToRefs(useMachinesStore())
let { sensors, heat } = storeToRefs(useMachinesModelStore())
let { temps, times } = storeToRefs(useMachinesSamplesStore())
let { temperatures, displayedExtraTemperatures } = storeToRefs(useMachinesSettingsStore())

// Register required components and scales
ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip)
// Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Legend)
/**
 * Specifies the interval at which temperature samples are recorded
 */
const sampleInterval = 1000

/**
 * Default maximum minimum in case it cannot be determined from the object model (in C)
 */
const defaultMinTemperature = 0

/**
 * Default maximum temperature in case it cannot be determined from the object model (in C)
 */
const defaultMaxTemperature = 300

/**
 * Maximum time to save sample data (in ms, defaults to 10min)
 */
// TODO make this configuarble, e.g. I'd prefer something like 5mins
const maxSampleTime = 600000

function getName(index: number, type: 'heater' | 'sensor', sensor: AnalogSensor) {
  let name
  if (sensor.name) {
    const matches = /(.*)\[(.*)\]$/.exec(sensor.name)
    name = matches ? matches[1] : sensor.name
  } else if (type == 'sensor') {
    name = t('chart.temperature.sensor', [index])
  } else {
    name = t('chart.temperature.heater', [index])
  }
  return name
}
/**
 * Push sensor data of a given machine to the dataset
 * @param machine Machine to add samples to
 * @param index Index of the sensor
 * @param extra If it is an extra sensor
 * @param sensor Sensor item
 */
function pushSensorDataToMachineSamples(
  index: number,
  type: 'heater' | 'sensor',
  sensor: AnalogSensor,
) {
  // Do we already have any samples recorded for this sensor?

  let datasetIndex = temps.value.findIndex((item) => {
    if (item.index === index && item.sensorType && type) {
      return item
    }
  })

  while (datasetIndex < 0) {
    // const color = '#BBB'
    const color = getRealHeaterColor(index, type == 'sensor', getComputedStyle(document.body))
    const newData = new Array<number>(times.value.length).fill(NaN)

    useMachinesSamplesStore()[selectedMachine.value].temps.push({
      index,
      sensorType: type,
      label: getName(index, type, sensor),
      fill: false,
      backgroundColor: color,
      borderColor: color,
      tension: 0,
      borderDash: type == 'sensor' ? [10, 5] : undefined,
      borderWidth: 2,
      data: newData,
      locale: locale.value,
      // pointStyle: false,
      pointRadius: 0,
      pointHitRadius: 10,
      rawLabel: null,
      showLine: true,
    })

    datasetIndex = temps.value.findIndex((item) => {
      if (item.index === index && item.sensorType && type) {
        return item
      }
    })
  }

  let dataset = temps.value[datasetIndex]

  // Check if the dataset has to be created first
  if (dataset.locale !== locale.value || dataset.rawLabel !== sensor.name) {
    useMachinesSamplesStore()[selectedMachine.value].temps[datasetIndex] = {
      ...dataset,
      rawLabel: sensor.name,
      label: getName(index, type, sensor),
      locale: locale.value,
    }
  }

  useMachinesSamplesStore()[selectedMachine.value].temps[datasetIndex] = {
    ...dataset,
    data: [...dataset.data, sensor.lastReading !== null ? sensor.lastReading : NaN],
  }
}

let lastUpdate = ref(0)

let maxX = ref(maxSampleTime)
let minX = computed(() => maxX.value - maxSampleTime)
let interval: NodeJS.Timeout | null = null

// TODO the lines appear glitchy during sudden changes, definitely worse than vue 2 DWC.
// Suspect it's due to the mess of drawing points vs lines but idk
let chartOptions = computed<ChartOptions<'line'>>(() => {
  return {
    // spanGaps: true,
    // showLine: false, // disable for all datasets
    animation: {
      duration: 0, // general animation time
    },
    elements: {
      line: {
        borderWidth: 0,
        backgroundColor: '#FFF',
        tension: 0, // disable bezier curves
      },
    },
    plugins: {
      legend: {
        display: false,
        // labels: {
        //   filter: (legendItem, data) =>
        //     (data.datasets![legendItem.datasetIndex!] as TempChartDataset).showLine,
        //   font: {
        //     family: 'Roboto,sans-serif',
        //   },
        // },
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        // intersect: false,
        // callbacks: {
        //   title: (tooltipItems) => {
        //     if (tooltipItems.length > 0) {
        //       return new Date(tooltipItems[0].parsed.x!).toLocaleTimeString()
        //     }
        //     return ''
        //   },
        //   label: (context) => {
        //     const dataset = context.dataset as any
        //     const temp = context.parsed.y
        //     return `${dataset.label}: ${temp!.toFixed(1)}°C`
        //   },
        // },
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    clip: 0,
    hover: {
      axis: 'xy',
    },
    scales: {
      x: {
        min: minX.value,
        max: maxX.value,

        type: 'time',
        // adapters: {
        //   date: {
        //     locale: enUS,
        //   },
        // },
        grid: {
          // display: true,
        },
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm',
          },
        },

        ticks: {
          minRotation: 45,
          maxRotation: 45,
          font: {
            family: 'Roboto,sans-serif',
          },
        },
      },
      y: {
        min: Math.min(
          minConfiguredTemperature.value,
          minHeaterTemperature.value !== null ? minHeaterTemperature.value : defaultMinTemperature,
        ),
        max:
          maxHeaterTemperature.value !== null ? maxHeaterTemperature.value : defaultMaxTemperature,
        grid: {
          // display: true,
        },
        ticks: {
          stepSize: 50,
          font: {
            family: 'Roboto,sans-serif',
          },
        },
      },
    },
  }
})

// let chartData = ref<any | null>(null)
let chartData = computed<ChartData<'line', number[]>>(() => {
  return {
    labels: times.value,
    datasets: temps.value,
  }
})

function applyDarkTheme(active: boolean) {
  const ticksColor = active ? '#FFF' : '#666'
  console.log('todo dark')
  // chartOptions.value.plugins!.legend!.labels!.color = ticksColor

  // chartOptions.value.scales!.x!.ticks!.color = ticksColor
  // chartOptions.value.scales!.y!.ticks!.color = ticksColor

  // const gridLineColor = active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
  // chartOptions.value.scales!.x!.grid!.color = gridLineColor
  // chartOptions.value.scales!.y!.grid!.color = gridLineColor
  // zeroLineColor is not supported in Chart.js v3+, so this line is removed or you may need to handle it differently if needed
}

let minConfiguredTemperature = computed(() => {
  let minTemperature = 0
  for (const bedTemp of temperatures.value.bed.active) {
    if (bedTemp < minTemperature) {
      minTemperature = bedTemp
    }
  }
  for (const bedTemp of temperatures.value.bed.standby) {
    if (bedTemp < minTemperature) {
      minTemperature = bedTemp
    }
  }
  for (const chamberTemp of temperatures.value.chamber) {
    if (chamberTemp < minTemperature) {
      minTemperature = chamberTemp
    }
  }
  for (const chamberTemp of temperatures.value.chamber) {
    if (chamberTemp < minTemperature) {
      minTemperature = chamberTemp
    }
  }
  for (const toolTemp of temperatures.value.tool.active) {
    if (toolTemp < minTemperature) {
      minTemperature = toolTemp
    }
  }
  for (const toolTemp of temperatures.value.tool.standby) {
    if (toolTemp < minTemperature) {
      minTemperature = toolTemp
    }
  }
  return minTemperature
})

let minHeaterTemperature = computed(() => {
  return useMachinesModelStore().minHeaterTemperature()
})

let maxHeaterTemperature = computed(() => {
  return useMachinesModelStore().maxHeaterTemperature()
})

watch(darkTheme, (newVal, oldVal) => {
  applyDarkTheme(newVal)
})

// watch(selectedMachine, (newVal, oldVal) => {
//   // Each chart instance is fixed to the currently selected machine
//   // Reassign the corresponding dataset whenever the selected machine changes
//   chartData.value = {
//     labels: tempSamples[newVal].times,
//     datasets: tempSamples[newVal].temps,
//   }
//   update()
// })
const { trigger } = watchTriggerable(
  [sensors, heat],
  ([newSensorsVal, newHeatVal]) => {
    const now = new Date().getTime()
    if (times.value.length === 0 || now - times.value[times.value.length - 1] > sampleInterval) {
      // Record sensor temperatures
      newSensorsVal.analog.forEach((sensor, sensorIndex) => {
        if (sensor !== null) {
          const heaterIndex: number = newHeatVal.heaters.findIndex(
            (maybeHeater) => maybeHeater !== null && maybeHeater.sensor === sensorIndex,
          )
          if (heaterIndex !== -1) {
            pushSensorDataToMachineSamples(heaterIndex, 'heater', sensor)
          } else {
            pushSensorDataToMachineSamples(sensorIndex, 'sensor', sensor)
          }
        }
      })

      // Record time and deal wih expired temperature samples
      while (times.value.length && now - times.value[0] > maxSampleTime) {
        times.value.shift()
        temps.value.forEach((data) => data.data!.shift())
      }
      times.value.push(now)

      // Deal with visibility and tell chart instances to update
      useMachinesSamplesStore()[selectedMachine.value].temps = temps.value.map((dataset) => {
        return {
          ...dataset,
          showLine:
            dataset.sensorType === 'heater' ||
            displayedExtraTemperatures.value.includes(dataset.index),
        }
      })
    }
  },
  { deep: true },
)

onMounted(() => {
  applyDarkTheme(darkTheme.value)
  interval = setInterval(() => {
    maxX.value = new Date().getTime()
  }, sampleInterval)
})

onUnmounted(() => {
  // Don't update this instance any more...
  // instances.value = instances.value.filter((instance) => instance !== this, this)
  // Don't forget to remove the interval before destroying the component
  if (interval) {
    clearInterval(interval)
  }
})
</script>
