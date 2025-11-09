<template>
  <Card class="col-span-full">
    <CNCMovementPanel />
  </Card>

  <Card class="col-span-3">
    <CardHeader>
      <CardTitle>
        <div class="flex flex-row items-center gap-2">
          <Gauge :size="18" />
          {{ $t('panel.spindle.title') }}
        </div>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <SpindleSpeedPanel />
    </CardContent>
  </Card>

  <MacroList />

  <Card class="col-span-3">
    <CardContent>
      <JobProgress />
    </CardContent>
  </Card>
  <Card class="col-span-1">
    <CardHeader>
      <CardTitle class="flex flex-row items-center gap-2">
        <Wrench :size="18" />
        {{ $t('panel.jobControl.caption') }}</CardTitle
      >
    </CardHeader>
    <CardContent>
      <JobControlPanel />
    </CardContent>
  </Card>
  <Card class="col-span-1">
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
  <Card class="col-span-1">
    <SpeedFactorPanel />
  </Card>

  <Alert v-if="unhomedAxes.length !== 0" variant="destructive" class="col-span-full">
    <AlertCircle class="w-4 h-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      {{ $t('panel.movement.axesNotHomed', unhomedAxes.length) }}
      <strong>
        {{ unhomedAxes.map((axis) => axis.letter).join(', ') }}
      </strong>
    </AlertDescription>
  </Alert>

  <Alert v-if="visibleAxes.length === 0" variant="destructive" class="col-span-full">
    <AlertCircle class="w-4 h-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      {{ $t('panel.movement.noAxes') }}
    </AlertDescription>
  </Alert>

  <!-- 
    <MeshEditDialog v-model:shown="showMeshEditDialog" />
    <InputDialog
      v-model:shown="moveStepDialog.shown"
      :title="$t('dialog.changeMoveStep.title')"
      :prompt="$t('dialog.changeMoveStep.prompt')"
      :preset="moveStepDialog.preset"
      is-numeric-value
      @confirmed="moveStepDialogConfirmed"
    /> -->
</template>

<script setup lang="ts">
import CNCMovementPanel from '@/components/layout/control/status/CNCMovementPanel.vue'
import MacroList from '@/components/lists/MacroList.vue'
import JobProgress from '@/components/misc/JobProgress.vue'
import JobControlPanel from '@/components/panels/JobControlPanel.vue'
import SpeedFactorPanel from '@/components/panels/SpeedFactorPanel.vue'
import SpindleSpeedPanel from '@/components/panels/SpindleSpeedPanel.vue'
import ZBabystepPanel from '@/components/panels/ZBabystepPanel.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import { useMachinesModelStore } from '@/stores/machineModel'
import { AlertCircle, FoldVertical, Gauge, Wrench } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'

let { visibleAxes, unhomedAxes } = storeToRefs(useMachinesModelStore())
</script>
