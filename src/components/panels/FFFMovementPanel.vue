<template>
  <CardHeader>
    <CardTitle class="flex flex-row gap-2 items-center">
      <CodeBtn
        v-show="visibleAxes.length"
        color="primary"
        small
        code="G28"
        :disabled="!canHome"
        :title="$t('button.home.titleAll')"
        class="ml-0 hidden-sm-and-down"
      >
        {{ $t('button.home.captionAll') }}
      </CodeBtn>

      <div class="grow"></div>

      <ArrowRightLeft :size="18" />
      {{ $t('panel.movement.caption') }}

      <div class="grow"></div>

      <DropdownMenu>
        <DropdownMenuTrigger class="w-72" as-child :disabled="uiFrozen">
          <Button variant="outline" v-show="visibleAxes.length" :disabled="uiFrozen">
            {{ $t('panel.movement.compensation') }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-72">
          <template v-if="isCompensationEnabled">
            <DropdownMenuGroup>
              <DropdownMenuItem v-show="isCompensationEnabled">
                <span>{{
                  $t('panel.movement.compensationInUse', [
                    $t(`panel.movement.compensationType.${compensationType}`),
                  ])
                }}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
          </template>

          <DropdownMenuGroup>
            <DropdownMenuItem :disabled="!canHome" @click="sendCode('G32')">
              <span>
                {{ $t(isDelta ? 'panel.movement.runDelta' : 'panel.movement.runBed') }}
              </span>
              <DropdownMenuShortcut><FoldVertical /></DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem :disabled="!isCompensationEnabled" @click="sendCode('M561')">
              <span> {{ $t('panel.movement.disableBedCompensation') }} </span>
              <DropdownMenuShortcut> <SquareDashed /> </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem :disabled="!canHome" @click="sendCode('G29')">
              <span> {{ $t('panel.movement.runMesh') }} </span>
              <DropdownMenuShortcut> <Grid2X2 /> </DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem :disabled="uiFrozen" @click="showMeshEditDialog = true">
              <span> {{ $t('panel.movement.editMesh') }} </span>
              <DropdownMenuShortcut> <Pencil /> </DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem :disabled="uiFrozen" @click="sendCode('G29 S1')">
              <span> {{ $t('panel.movement.loadMesh') }} </span>
              <DropdownMenuShortcut><Save /></DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem :disabled="!isCompensationEnabled" @click="sendCode('G29 S2')">
              <span> {{ $t('panel.movement.disableMeshCompensation') }} </span>
              <DropdownMenuShortcut><Grid2X2X /></DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardTitle>
  </CardHeader>

  <CardContent v-show="visibleAxes.length > 0">
    <div class="flex flex-col w-full gap-1">
      <!-- Mobile home buttons -->
      <div class="flex flex-row gap-1 w-full">
        <div class="flex flex-col shrink min-w-0 gap-1">
          <!-- HOME AXIS BUTTON -->
          <template v-if="!isDelta">
            <CodeBtn
              v-for="(axis, axisIndex) in visibleAxes"
              :key="axisIndex"
              cols="auto"
              class="flex-shrink-1 hidden-sm-and-down"
              :color="axis.homed ? 'primary' : 'warning'"
              :disabled="!canHome"
              :title="
                $t('button.home.title', [
                  /[a-z]/.test(axis.letter) ? `'${axis.letter}` : axis.letter,
                ])
              "
              :code="`G28 ${/[a-z]/.test(axis.letter) ? '\'' : ''}${axis.letter}`"
            >
              {{ $t('button.home.caption', [axis.letter]) }}
            </CodeBtn>
          </template>
        </div>

        <!-- JOG BUTTONS NEGATIVE -->
        <div class="flex flex-col grow min-w-0 gap-1" v-for="index in numMoveSteps" :key="index">
          <CodeBtn
            v-for="(axis, axisIndex) in visibleAxes"
            :key="axisIndex"
            variant="secondary"
            :class="getMoveCellClass(index - 1)"
            :code="getMoveCode(axis, index - 1, true)"
            :disabled="!canMove(axis)"
            @contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)"
          >
            <ChevronLeft />
            {{
              axis.letter +
              showSign(-useMachinesSettingsStore().getMoveSteps(axis.letter)[index - 1])
            }}
          </CodeBtn>
        </div>

        <!-- JOG BUTTONS POSITIVE -->
        <div class="flex flex-col grow min-w-0 gap-1" v-for="index in numMoveSteps" :key="index">
          <CodeBtn
            v-for="(axis, axisIndex) in visibleAxes"
            :key="axisIndex"
            variant="secondary"
            :class="getMoveCellClass(numMoveSteps - index)"
            :code="getMoveCode(axis, numMoveSteps - index, false)"
            :disabled="!canMove(axis)"
            @contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)"
          >
            {{
              axis.letter +
              showSign(useMachinesSettingsStore().getMoveSteps(axis.letter)[numMoveSteps - index])
            }}
            <ChevronRight />
          </CodeBtn>
        </div>
      </div>
    </div>
  </CardContent>
  <CardFooter>
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

    <Alert v-if="unhomedAxes.length !== 0" variant="destructive">
      <AlertCircle class="w-4 h-4" />
      <AlertTitle>
        {{ $t('panel.movement.axesNotHomed', unhomedAxes.length) }}
        {{ unhomedAxes.map((axis) => axis.letter).join(', ') }}</AlertTitle
      >
    </Alert>
    <Alert v-if="visibleAxes.length === 0" variant="destructive">
      <AlertCircle class="w-4 h-4" />
      <AlertTitle>
        {{ $t('panel.movement.noAxes') }}
      </AlertTitle>
    </Alert>
  </CardFooter>
</template>

<script setup lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import {
  Axis,
  AxisLetter,
  KinematicsName,
  MachineStatus,
  MoveCompensationType,
} from '@duet3d/objectmodel'
import { storeToRefs } from 'pinia'

import {
  AlertCircle,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  FoldVertical,
  Grid2X2,
  Grid2X2X,
  Pencil,
  Save,
  SquareDashed,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import CodeBtn from '../buttons/CodeBtn.vue'
import { Alert, AlertTitle } from '../ui/alert'
import { Button } from '../ui/button'
import { CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

let showMeshEditDialog = ref(false)
let moveStepDialog = ref({
  shown: false,
  axis: AxisLetter.X,
  index: 0,
  preset: 0,
})

let { isConnected, uiFrozen } = storeToRefs(useRootStore())
let { numMoveSteps } = storeToRefs(useMachinesSettingsStore())
let { move, state } = storeToRefs(useMachinesModelStore())

watch(isConnected, (newVal, oldVal) => {
  // Hide dialogs when the connection is interrupted
  showMeshEditDialog.value = false
  moveStepDialog.value.shown = false
})

let isCompensationEnabled = computed(() => {
  return move.value.compensation.type !== MoveCompensationType.none
})

let compensationType = computed(() => {
  return move.value.compensation.type
})

let visibleAxes = computed(() => {
  return move.value.axes.filter((axis) => axis.visible) as Axis[]
})
let isDelta = computed(() => {
  return [KinematicsName.delta, KinematicsName.rotaryDelta].includes(move.value.kinematics.name)
})

let unhomedAxes = computed(() => {
  return move.value.axes.filter((axis) => axis.visible && !axis.homed) as Axis[]
})

async function sendCode(code: string) {
  await useMachinesStore().sendCode(code)
}

let canHome = computed(() => {
  return (
    !uiFrozen.value &&
    state.value.status !== MachineStatus.pausing &&
    state.value.status !== MachineStatus.processing &&
    state.value.status !== MachineStatus.resuming
  )
})

function canMove(axis: Axis) {
  return (axis.homed || !move.value.noMovesBeforeHoming) && canHome.value
}
function getMoveCellClass(index: number) {
  let classes = ''
  if (index === 0 || index === 5) {
    classes += 'hidden-lg-and-down'
  }
  if (index > 1 && index < 4 && index % 2 === 1) {
    classes += 'hidden-md-and-down'
  }
  return classes
}
function getMoveCode(axis: Axis, index: number, decrementing: boolean) {
  return `M120\nG91\nG1 ${/[a-z]/.test(axis.letter) ? "'" : ''}${axis.letter}${decrementing ? '-' : ''}${useMachinesSettingsStore().getMoveSteps(axis.letter)[index]} F${useMachinesSettingsStore().moveFeedrate}\nM121`
}
function showSign(value: number) {
  return value > 0 ? `+${value}` : value
}

function showMoveStepDialog(axis: AxisLetter, index: number) {
  moveStepDialog.value.axis = axis
  moveStepDialog.value.index = index
  moveStepDialog.value.preset = useMachinesSettingsStore().getMoveSteps(moveStepDialog.value.axis)[
    moveStepDialog.value.index
  ]
  moveStepDialog.value.shown = true
}
function moveStepDialogConfirmed(value: number) {
  useMachinesSettingsStore().setMoveStep({
    axis: moveStepDialog.value.axis,
    index: moveStepDialog.value.index,
    value,
  })
}
</script>
