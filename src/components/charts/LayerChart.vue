<template>
  <CardHeader>
    <CardTitle class="flex flex-row items-center gap-2">
      <ChartNoAxesColumn />
      {{ $t('chart.layer.caption') }}
      <a
        class="ml-auto"
        v-show="layers.length > 2"
        href="javascript:void(0)"
        @click.prevent="showAllLayers = !showAllLayers"
      >
        {{
          showAllLayers
            ? $t('chart.layer.showLastLayers', [Math.min(layers.length, 30)])
            : $t('chart.layer.showAllLayers')
        }}
      </a>
    </CardTitle>
  </CardHeader>
  <CardContent class="h-full">
    <canvas ref="chartElement" />
  </CardContent>
</template>

<script setup lang="ts">
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Layer, ModelCollection } from '@duet3d/objectmodel'
import {
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
} from 'chart.js'

const chartElement = useTemplateRef('chartElement')

import { useMachinesModelStore } from '@/stores/machineModel'
import { useSettingsStore } from '@/stores/settings'
import { display, displayTime, displayZ } from '@/utils/display'

// Register required components and scales
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  // Legend,
  CategoryScale,
)

import { ChartNoAxesColumn } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
// TODO chart may be broken, see
// https://stackoverflow.com/questions/68602389/maximum-call-stack-error-when-attempting-to-update-chart-in-vue-js/68609820#68609820
let chart
let showAllLayers = ref(false)
let { darkTheme, language } = storeToRefs(useSettingsStore())
let { job } = storeToRefs(useMachinesModelStore())

let layers = computed(() => {
  return job.value.layers as ModelCollection<Layer>
})

let { t } = useI18n()

onMounted(() => {
  const _chartElement = chartElement.value
  if (!_chartElement) {
    console.log('_chartElement null')
    return
  }

  chart = shallowRef(
    new Chart(_chartElement, {
      type: 'line',
      options: {
        elements: {
          line: {
            tension: 0,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: (tooltipItems) => t('chart.layer.layer', [tooltipItems![0].dataIndex! + 1]),
              label(tooltipItem) {
                const layer = layers.value[tooltipItem.dataIndex!]
                let result = [t('chart.layer.layerDuration', [displayTime(layer.duration, false)])]
                if (layer.height) {
                  result.push(t('chart.layer.layerHeight', [displayZ(layer.height)]))
                }
                if (layer.filament) {
                  result.push(t('chart.layer.filamentUsage', [display(layer.filament, 1, 'mm')]))
                }
                if (layer.fractionPrinted) {
                  result.push(
                    t('chart.layer.fractionPrinted', [
                      display(layer.fractionPrinted * 100, 1, '%'),
                    ]),
                  )
                }
                if (layer.temperatures) {
                  result.push(
                    t('chart.layer.temperatures', [
                      layer.temperatures.map((temp) => display(temp, 1, 'C')).join(', '),
                    ]),
                  )
                }
                return result
              },
            },
          },
        },
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              color: 'rgba(0,0,0,0.2)',
              display: true,
            },
            beginAtZero: true,
            ticks: {
              color: 'rgba(0,0,0,0.87)',
              font: {
                family: 'Roboto,sans-serif',
              },
              maxRotation: 0,
              stepSize: 5,
            },
          },
          y: {
            grid: {
              color: 'rgba(0,0,0,0.87)',
              display: true,
            },
            beginAtZero: true,
            suggestedMax: 30,
            ticks: {
              color: 'rgba(0,0,0,0.87)',
              font: {
                family: 'Roboto,sans-serif',
              },
              callback: (tickValue, index, ticks) => {
                return displayTime(Number(tickValue), false)
              },
            },
          },
        },

        // panning and zooming is not supported until the panning feature of chartjs-plugin-zoom is fixed
      },
      data: {
        datasets: [
          {
            type: 'line',
            data: [],
            borderColor: 'rgba(0, 129, 214, 0.8)',
            backgroundColor: 'rgba(0, 129, 214, 0.8)',
            fill: false,
            label: t('chart.layer.layerTime'),
          },
        ],
      },
    }),
  )
  applyDarkTheme(darkTheme.value)
  updateChart()
})
function updateChart() {
  chart.value!.data.labels = layers.value.map((_, index) => index + 1)
  chart.value!.data.datasets![0].data = layers.value.map((layer) => layer.duration)

  if (showAllLayers.value) {
    chart.value!.config.options!.scales!.x!.min = 1
    chart.value!.config.options!.scales!.x!.max = layers.value.length
  } else {
    chart.value!.config.options!.scales!.x!.min = Math.max(
      layers.value.length > 2 ? 2 : 1,
      layers.value.length - 30,
    )
    chart.value!.config.options!.scales!.x!.max = Math.max(30, layers.value.length)
  }
  chart.value!.update()
}
function applyDarkTheme(active: boolean) {
  const ticksColor = active ? '#FFF' : '#666'
  chart.value!.config.options!.scales!.x!.ticks!.color = ticksColor
  chart.value!.config.options!.scales!.y!.ticks!.color = ticksColor

  const gridLineColor = active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
  chart.value!.config.options!.scales!.x!.grid!.color = gridLineColor
  chart.value!.config.options!.scales!.y!.grid!.color = gridLineColor

  chart.value!.update()
}

watch(darkTheme, (newVal, oldVal) => {
  applyDarkTheme(newVal)
})
watch(language, (newVal, oldVal) => {
  chart.value!.data.datasets![0].label = t('chart.layer.layerTime')
})
watch(layers, (newVal, oldVal) => {
  updateChart()
})
watch(showAllLayers, (newVal, oldVal) => {
  updateChart()
})
</script>
