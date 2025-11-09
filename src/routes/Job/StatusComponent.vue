<template>
  <div class="w-full grid grid-cols-4 gap-2">
    <Card class="col-span-full">
      <CardContent>
        <JobProgress />
      </CardContent>
    </Card>

    <div class="h-full flex flex-col gap-2">
      <Card class="flex-grow col-span-1">
        <CardHeader>
          <CardTitle class="flex flex-row items-center gap-2">
            <Wrench :size="18" />
            {{ $t('panel.jobControl.caption') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <JobControlPanel />
        </CardContent>
      </Card>

      <Card class="flex-grow col-span-full">
        <CardHeader>
          <CardTitle class="flex flex-row items-center gap-2">
            <FoldVertical :size="18" />
            {{ $t('panel.babystepping.caption') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ZBabystepPanel />
        </CardContent>
      </Card>

      <Card class="flex-grow col-span-full">
        <CardHeader>
          <CardTitle class="flex flex-row items-center gap-2">
            <Info :size="18" />
            {{ $t('panel.jobInfo.caption') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <JobInfoPanel />
        </CardContent>
      </Card>
    </div>

    <div class="col-span-2 h-full flex flex-col gap-2">
      <Card class="col-span-full flex-grow">
        <LayerChart />
      </Card>
      <Card class="col-span-full">
        <CardHeader>
          <CardTitle class="flex flex-row items-center gap-2">
            <Clock :size="18" />
            {{ $t('panel.jobEstimations.caption') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <JobEstimationsPanel />
        </CardContent>
      </Card>
      <Card class="col-span-full">
        <CardHeader>
          <CardTitle class="flex flex-row items-center gap-2">
            <Ellipsis :size="18" />
            {{ $t('panel.jobData.caption') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <JobDataPanel />
        </CardContent>
      </Card>
    </div>

    <div class="h-full flex flex-col gap-2">
      <Card class="flex-grow col-span-full">
        <SpeedFactorPanel />
      </Card>
      <Card class="flex-grow col-span-full">
        <FansPanel />
      </Card>
      <Card class="flex-grow col-span-full">
        <ExtrusionFactorsPanel />
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import LayerChart from '@/components/charts/LayerChart.vue'
import JobProgress from '@/components/misc/JobProgress.vue'
import ExtrusionFactorsPanel from '@/components/panels/ExtrusionFactorsPanel.vue'
import FansPanel from '@/components/panels/FansPanel.vue'
import JobControlPanel from '@/components/panels/JobControlPanel.vue'
import JobDataPanel from '@/components/panels/JobDataPanel.vue'
import JobEstimationsPanel from '@/components/panels/JobEstimationsPanel.vue'
import JobInfoPanel from '@/components/panels/JobInfoPanel.vue'
import SpeedFactorPanel from '@/components/panels/SpeedFactorPanel.vue'
import ZBabystepPanel from '@/components/panels/ZBabystepPanel.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Ellipsis, FoldVertical, Info, Wrench } from 'lucide-vue-next'
</script>
