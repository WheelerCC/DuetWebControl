<template>
  <CardHeader>
    <CardTitle class="flex flex-row gap-2">
      <ArrowRightLeft />
      {{ $t('panel.movement.caption') }}

      <div class="grow"></div>
      <DropdownMenu>
        <DropdownMenuTrigger class="w-72" as-child :disabled="uiFrozen">
          <Button variant="outline" v-show="visibleAxes.length" :disabled="uiFrozen">
            {{ $t('panel.movement.compensation') }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-72">
          <!-- <DropdownMenuGroup> -->
          <!-- <DropdownMenuItem v-show="isCompensationEnabled">
                <span>{{ $t('panel.movement.compensationInUse', [compensationType]) }}</span>
              </DropdownMenuItem> -->
          <!-- </DropdownMenuGroup> -->

          <!-- <DropdownMenuSeparator /> -->
          <DropdownMenuGroup>
            <DropdownMenuItem @click="sendCode('G32')">
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
            <DropdownMenuItem @click="sendCode('G29')">
              <span> {{ $t('panel.movement.runMesh') }} </span>
              <DropdownMenuShortcut> <Grid2X2 /> </DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem @click="showMeshEditDialog = true">
              <span> {{ $t('panel.movement.editMesh') }} </span>
              <DropdownMenuShortcut> <Pencil /> </DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem @click="sendCode('G29 S1')">
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
      <Select v-model="move.workplaceNumber">
        <SelectTrigger class="w-[150px]">
          <SelectValue class="w-full">
            <div class="flex flex-row w-full">
              <div>{{ `WCS ${workplaceNumber + 1}` }}</div>
              <Kbd class="ml-auto">{{ getWCSCommand(workplaceNumber) }}</Kbd>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem
              v-for="(coordinate, coordinateIndex) in Array(9).keys()"
              :value="coordinateIndex"
              :key="coordinateIndex"
            >
              <SelectItemText class="w-full">
                <div class="flex flex-row w-full">
                  <div>{{ `WCS ${coordinate + 1}` }}</div>
                  <Kbd class="ml-auto">{{ getWCSCommand(coordinate) }}</Kbd>
                </div>
              </SelectItemText>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </CardTitle>
  </CardHeader>
  <CardContent v-show="visibleAxes.length">
    <div class="flex flex-col w-full gap-1">
      <div class="flex flex-row min-w-0">
        <CodeBtn
          v-show="visibleAxes.length"
          block
          color="primary"
          code="G28"
          :title="$t('button.home.titleAll')"
          class="ml-0"
        >
          {{ $t('button.home.captionAll') }}
        </CodeBtn>

        <Button class="ml-auto" @click="setWorkplaceZero">
          {{ $t('panel.movement.setWorkXYZ') }}
        </Button>
      </div>
      <!-- todo calc cols, rather than fixed 12 -->

      <div class="flex flex-row gap-1 w-full">
        <div class="flex flex-col shrink min-w-0 gap-1">
          <!-- HOME AXIS BUTTON -->
          <CodeBtn
            v-for="(axis, axisIndex) in visibleAxes"
            :key="axisIndex"
            tile
            block
            :variant="axis.homed ? 'default' : 'ghost'"
            :disabled="uiFrozen"
            :title="
              $t('button.home.title', [/[a-z]/.test(axis.letter) ? `'${axis.letter}` : axis.letter])
            "
            :code="`G28 ${/[a-z]/.test(axis.letter) ? '\'' : ''}${axis.letter}`"
          >
            {{ $t('button.home.caption', [axis.letter]) }}
          </CodeBtn>
        </div>

        <!-- JOG BUTTONS NEGATIVE -->
        <div class="flex flex-col grow min-w-0 gap-1" v-for="index in numMoveSteps" :key="index">
          <CodeBtn
            v-for="(axis, axisIndex) in visibleAxes"
            :key="axisIndex"
            variant="secondary"
            :class="getMoveCellClass(index - 1)"
            :code="getMoveCode(axis, index - 1, true)"
            @contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)"
          >
            <ChevronLeft />
            {{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
          </CodeBtn>
        </div>

        <!-- JOG BUTTONS POSITIVE -->
        <div class="flex flex-col grow min-w-0 gap-1" v-for="index in numMoveSteps" :key="index">
          <CodeBtn
            v-for="(axis, axisIndex) in visibleAxes"
            :key="axisIndex"
            :class="getMoveCellClass(numMoveSteps - index)"
            :code="getMoveCode(axis, numMoveSteps - index, false)"
            variant="secondary"
            @contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)"
          >
            {{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }}
            <ChevronRight />
          </CodeBtn>
        </div>

        <div class="flex flex-col shrink min-w-0 gap-1">
          <!-- WCS SET ZERO AXIS -->
          <CodeBtn
            v-for="(axis, axisIndex) in visibleAxes"
            :key="axisIndex"
            color="warning"
            :code="`G10 L20 P${currentWorkplace} ${axis.letter}0`"
          >
            {{ $t('panel.movement.set', [axis.letter]) }}
          </CodeBtn>
        </div>
      </div>

      <div class="flex flex-row">
        <CodeBtn :code="`M98 P'workzero.g'`">
          {{ $t('panel.movement.workzero') }}
        </CodeBtn>
      </div>
    </div>
  </CardContent>
</template>

<script setup lang="ts">
import CodeBtn from '@/components/buttons/CodeBtn.vue'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { Axis, AxisLetter } from '@duet3d/objectmodel'
import {
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
import { storeToRefs } from 'pinia'

import { computed, ref, watch } from 'vue'

let showMeshEditDialog = ref(false)

let moveStepDialog = ref({
  shown: false,
  axis: AxisLetter.X,
  index: 0,
  preset: 0,
})

let { uiFrozen, isConnected } = storeToRefs(useRootStore())
let { numMoveSteps, moveFeedrate } = storeToRefs(useMachinesSettingsStore())
let {
  visibleAxes,
  isDelta,
  move,
  unhomedAxes,
  workplaceNumber,
  isCompensationEnabled,
  compensationType,
} = storeToRefs(useMachinesModelStore())

function moveSteps(axisLetter: AxisLetter) {
  return useMachinesSettingsStore().getMoveSteps(axisLetter)
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
  return `M120\nG91\nG1 ${/[a-z]/.test(axis.letter) ? "'" : ''}${axis.letter}${decrementing ? '-' : ''}${moveSteps(axis.letter)[index]} F${moveFeedrate.value}\nM121`
}

function showSign(value: number) {
  return value > 0 ? `+${value}` : value
}

function showMoveStepDialog(axis: AxisLetter, index: number) {
  moveStepDialog.value.axis = axis
  moveStepDialog.value.index = index
  moveStepDialog.value.preset = moveSteps(moveStepDialog.value.axis)[moveStepDialog.value.index]
  moveStepDialog.value.shown = true
}

function moveStepDialogConfirmed(value: number) {
  useMachinesSettingsStore().setMoveStep({
    axis: moveStepDialog.value.axis,
    index: moveStepDialog.value.index,
    value,
  })
}

async function sendCode(code: string) {
  await useMachinesStore().sendCode(code)
}

async function setWorkplaceZero() {
  let code = `G10 L20 P${currentWorkplace.value}`
  visibleAxes.value.forEach((axis) => (code += ` ${axis.letter}0`))
  await useMachinesStore().sendCode(`${code}\nG10 L20 P${currentWorkplace.value}`)
}

let currentWorkplace = computed(() => {
  return workplaceNumber.value + 1
})

watch(currentWorkplace, async (newVal, oldVal) => {
  let code = getWCSCommand(newVal)
  await useMachinesStore().sendCode(`${code}\nG10 L20 P${currentWorkplace.value}`)
})

function getWCSCommand(workspace: number) {
  if (workspace < 7) {
    return `G${53 + workspace}`
  } else {
    return `G59.${workspace - 6}`
  }
}

watch(isConnected, (newVal, oldVal) => {
  // Hide dialogs when the connection is interrupted
  showMeshEditDialog.value = false
  moveStepDialog.value.shown = false
})
</script>
