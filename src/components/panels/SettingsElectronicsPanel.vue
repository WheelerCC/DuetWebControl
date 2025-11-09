<template>
  <v-card outlined>
    <v-card-title>
      {{ $t('panel.settingsElectronics.caption') }}

      <v-spacer />

      <a v-show="isConnected" href="javascript:void(0)" @click="diagnostics">
        <v-icon small>mdi-lifebuoy</v-icon>
        {{ $t('panel.settingsElectronics.diagnostics') }}
      </a>
    </v-card-title>

    <v-simple-table v-if="isConnected">
      <thead>
        <tr>
          <th>
            {{ 'Product' }}
          </th>
          <th>
            {{ 'Short Name' }}
          </th>
          <th>
            {{ 'Version' }}
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Boards -->
        <tr v-for="(board, index) in boards" :key="index">
          <td>
            {{ board.name }}
            <v-tooltip v-if="board.canAddress" location="bottom">
              <template #activator="{ props }">
                <v-icon v-bind="props" size="small"> mdi-information-outline </v-icon>
              </template>
              <span>
                {{ $t('panel.settingsElectronics.canAddress', [board.canAddress]) }}
              </span>
            </v-tooltip>
          </td>
          <td>
            {{ board.shortName }}
          </td>
          <td :title="$t('panel.settingsAbout.buildDateTime', [board.firmwareDate])">
            {{ board.firmwareVersion }}
          </td>
        </tr>

        <!-- WiFi Server-->
        <tr v-if="wifiVersion !== null">
          <td>Duet WiFi Server</td>
          <td>
            {{ $t('generic.noValue') }}
          </td>
          <td>
            {{ wifiVersion }}
          </td>
        </tr>

        <!-- DSF-->
        <tr
          v-if="dsfVersion !== null"
          :title="$t('panel.settingsAbout.buildDateTime', [dsfBuildDateTime])"
        >
          <td>Duet Software Framework</td>
          <td>DSF</td>
          <td>
            {{ dsfVersion }}
          </td>
        </tr>

        <!-- DWC -->
        <tr>
          <td>Duet Web Control</td>
          <td>DWC</td>
          <td :title="$t('panel.settingsAbout.buildDateTime', [buildDateTime])">
            {{ dwcVersion }}
          </td>
        </tr>
      </tbody>
    </v-simple-table>
    <v-card-text v-else>
      {{ $t('panel.settingsElectronics.notConnected') }}
    </v-card-text>

    <upload-btn
      v-if="!isRestConnector || !isDuetFirmware"
      class="my-3 d-flex justify-center"
      target="update"
      color="primary"
    />
  </v-card>
</template>

<script lang="ts">
import { RestConnector } from '@duet3d/connectors'
import { Board, NetworkInterfaceType } from '@duet3d/objectmodel'

import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import packageInfo from '../../../package.json'

import { defineComponent } from 'vue'

export default defineComponent({
  compatConfig: {
    MODE: 2,
  },
  data() {
    return {
      buildDateTime: process.env.BUILD_DATETIME,
      dwcVersion: packageInfo.version,
    }
  },
  computed: {
    isConnected(): boolean {
      return useRootStore().isConnected
    },
    isRestConnector(): boolean {
      return useMachinesStore().connector instanceof RestConnector
    },
    boards(): Board[] {
      return useMachinesModelStore().boards.filter((board) => board !== null) as Board[]
    },
    isDuetFirmware(): boolean {
      return this.boards.some(
        (board) => !board.canAddress && board.firmwareFileName.startsWith('Duet'),
      )
    },
    dsfVersion(): string | null {
      return useMachinesModelStore().sbc?.dsf.version ?? null
    },
    dsfBuildDateTime(): string | null {
      return useMachinesModelStore().sbc?.dsf.buildDateTime ?? null
    },
    wifiVersion(): string | null {
      return (
        useMachinesModelStore().network.interfaces.find(
          (iface) => iface.type === NetworkInterfaceType.wifi,
        )?.firmwareVersion ?? null
      )
    },
  },
  methods: {
    async diagnostics() {
      await useMachinesStore().sendCode('M122')
      await this.$router.push('/Console')
    },
  },
})
</script>

<style scoped>
th {
  padding: 0 16px;
  text-align: left;
}
</style>
