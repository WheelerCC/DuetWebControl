<template>
  <CardHeader>
    <CardTitle class="flex flex-row gap-2">
      {{ $t('panel.settingsElectronics.caption') }}

      <a
        v-show="isConnected"
        href="javascript:void(0)"
        @click="diagnostics"
        class="ml-auto flex flex-row gap-2 items-center"
      >
        <LifeBuoy :size="18" />
        {{ $t('panel.settingsElectronics.diagnostics') }}
      </a>
    </CardTitle>
  </CardHeader>
  <CardContent class="flex flex-col gap-5">
    <Table v-if="isConnected">
      <TableHeader>
        <TableRow>
          <TableHead>{{ 'Product' }}</TableHead>
          <TableHead>{{ 'Short Name' }}</TableHead>
          <TableHead>{{ 'Version' }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <!-- Boards -->
        <TableRow v-for="(board, index) in internalBoards" :key="index">
          <TableCell>
            {{ board.name }}
            <v-tooltip v-if="board.canAddress" location="bottom">
              <template #activator="{ props }">
                <v-icon v-bind="props" size="small"> mdi-information-outline </v-icon>
              </template>
              <span>
                {{ $t('panel.settingsElectronics.canAddress', [board.canAddress]) }}
              </span>
            </v-tooltip>
          </TableCell>
          <TableCell>
            {{ board.shortName }}
          </TableCell>
          <TableCell :title="$t('panel.settingsAbout.buildDateTime', [board.firmwareDate])">
            {{ board.firmwareVersion }}
          </TableCell>
        </TableRow>

        <!-- WiFi Server-->
        <TableRow v-if="wifiVersion !== null">
          <TableCell>Duet WiFi Server</TableCell>
          <TableCell>
            {{ $t('generic.noValue') }}
          </TableCell>
          <TableCell>
            {{ wifiVersion }}
          </TableCell>
        </TableRow>

        <!-- DSF-->
        <TableRow
          v-if="dsfVersion !== null"
          :title="$t('panel.settingsAbout.buildDateTime', [dsfBuildDateTime])"
        >
          <TableCell>Duet Software Framework</TableCell>
          <TableCell>DSF</TableCell>
          <TableCell>
            {{ dsfVersion }}
          </TableCell>
        </TableRow>

        <!-- DWC -->
        <TableRow>
          <TableCell>Duet Web Control</TableCell>
          <TableCell>DWC</TableCell>
          <TableCell :title="$t('panel.settingsAbout.buildDateTime', [buildDateTime])">
            {{ dwcVersion }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div v-else>
      {{ $t('panel.settingsElectronics.notConnected') }}
    </div>

    <UploadBtn
      v-if="!isRestConnector || !isDuetFirmware"
      class="mx-auto w-full"
      :target="UploadType.update"
      color="primary"
    />
  </CardContent>
</template>

<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { NetworkInterfaceType } from '@duet3d/objectmodel'

import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import packageInfo from '../../../package.json'

import router from '@/routes'
import { LifeBuoy } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import UploadBtn, { UploadType } from '../buttons/UploadBtn.vue'
import { CardContent, CardHeader, CardTitle } from '../ui/card'

let buildDateTime = ref(process.env.BUILD_DATETIME)
let dwcVersion = ref(packageInfo.version)

let { isConnected } = storeToRefs(useRootStore())
let { isRestConnector } = storeToRefs(useMachinesStore())
let { boards, sbc, network } = storeToRefs(useMachinesModelStore())

let internalBoards = computed(() => boards.value.filter((board) => board !== null))

let isDuetFirmware = computed(() =>
  internalBoards.value.some(
    (board) => !board.canAddress && board.firmwareFileName.startsWith('Duet'),
  ),
)

let dsfVersion = computed(() => sbc.value?.dsf.version ?? null)
let dsfBuildDateTime = computed(() => sbc.value?.dsf.buildDateTime ?? null)

let wifiVersion = computed(
  () =>
    network.value.interfaces.find((iface) => iface.type === NetworkInterfaceType.wifi)
      ?.firmwareVersion ?? null,
)

async function diagnostics() {
  await useMachinesStore().sendCode('M122')
  await router.push('/Console')
}
</script>
