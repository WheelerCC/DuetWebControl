<template>
  <div class="grid grid-cols-3 gap-3 m-3">
    <Card class="rounded-md">
      <StatusPanel />
    </Card>
    <ToolsPanel />

    <Card class="rounded-md gap-2">
      <CardHeader>
        <CardTitle class="flex flex-row gap-2">
          <ChartLine :size="18" />
          {{ $t('chart.temperature.caption') }}
        </CardTitle>
      </CardHeader>

      <TemperatureChart />
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useMachinesStore } from '@/stores/machines'

import TemperatureChart from '@/components/charts/TemperatureChart.vue'
import StatusPanel from '@/components/panels/StatusPanel.vue'
import ToolsPanel from '@/components/panels/ToolsPanel/ToolsPanel.vue'
import { computed } from 'vue'

import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartLine } from 'lucide-vue-next'

const hasTemperaturesToDisplay = computed(() => {
  return useMachinesStore().hasTemperaturesToDisplay
})
</script>
