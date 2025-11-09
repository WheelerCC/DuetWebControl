<template>
  <v-dialog v-model="shown" max-width="480">
    <v-card>
      <v-card-title class="headline">
        <v-icon class="mr-1"> mdi-alert </v-icon>
        {{ $t('dialog.incompatibleVersions.title') }}
      </v-card-title>

      <v-card-text>
        <p>
          {{ $t('dialog.incompatibleVersions.prompt') }}
        </p>
        <i18n-t tag="p" keypath="dialog.incompatibleVersions.upgradeNotice" class="mb-0">
          <template #docs>
            <a :href="upgradeDocs" target="_blank">docs</a>
          </template>
        </i18n-t>
      </v-card-text>

      <v-card-actions>
        <v-btn color="blue darken1" class="mx-auto" text @click="shown = false">
          {{ $t('generic.ok') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { log, logToConsole } from '@/utils/logging'
import semver from 'semver'

import packageInfo from '../../../package.json'

import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { LogType } from '@/utils/logging'
import { MachineStatus } from '@duet3d/objectmodel'

const patchDiffs: Array<semver.ReleaseType | null> = ['patch', 'prepatch', 'prerelease']

import { defineComponent } from 'vue'

export default defineComponent({
  compatConfig: {
    MODE: 2,
  },
  data() {
    return {
      checkVersionsTimeout: null as NodeJS.Timeout | null,
      shown: false,
    }
  },
  computed: {
    isConnecting(): boolean {
      return useRootStore().isConnecting
    },
    state(): MachineStatus {
      return useMachinesModelStore().state.status
    },
    upgradeDocs(): string {
      return useMachinesModelStore().sbc !== null
        ? 'https://docs.duet3d.com/en/User_manual/Machine_configuration/SBC_setup'
        : 'https://docs.duet3d.com/en/User_manual/RepRapFirmware/Updating_firmware'
    },
  },
  watch: {
    state(to: MachineStatus, from: MachineStatus) {
      if (
        [MachineStatus.disconnected, MachineStatus.updating, MachineStatus.starting].includes(to)
      ) {
        // Update/Startup not done yet, don't perform versions check yet
        if (this.checkVersionsTimeout !== null) {
          clearTimeout(this.checkVersionsTimeout)
          this.checkVersionsTimeout = null
        }
      } else if (
        [MachineStatus.disconnected, MachineStatus.updating, MachineStatus.starting].includes(from)
      ) {
        if (this.checkVersionsTimeout === null) {
          // No longer updating or starting, perform versions check in 2s
          this.checkVersionsTimeout = setTimeout(this.checkVersions, 2000)
        }
      }
    },
  },
  mounted() {
    if (!this.isConnecting) {
      // Wait 2s before performing the versions check
      this.checkVersionsTimeout = setTimeout(this.checkVersions, 2000)
    }
  },
  methods: {
    checkVersions() {
      this.checkVersionsTimeout = null
      if (useMachinesSettingsStore().checkVersions) {
        let versionMismatch = false,
          patchVersionMismatch = false
        try {
          const mainboardVersion = useMachinesModelStore().boards.find(
            (board) => !board.canAddress,
          )?.firmwareVersion
          if (mainboardVersion) {
            // Check expansion board firmware versions
            for (const board of useMachinesModelStore().boards) {
              if (
                board.canAddress &&
                board.firmwareVersion &&
                semver.compare(mainboardVersion, board.firmwareVersion, true) !== 0
              ) {
                const vDiff = semver.diff(mainboardVersion, board.firmwareVersion)
                if (patchDiffs.includes(vDiff)) {
                  console.warn(
                    `Expansion board #${board.canAddress} minor version mismatch (MB ${mainboardVersion} != EXP ${board.firmwareVersion})`,
                  )
                  patchVersionMismatch = true
                } else {
                  console.warn(
                    `Expansion board #${board.canAddress} major version mismatch (MB ${mainboardVersion} != EXP ${board.firmwareVersion})`,
                  )
                  versionMismatch = true
                }
              }
            }

            // Check DSF version
            if (
              !versionMismatch &&
              useMachinesModelStore().sbc !== null &&
              semver.compare(mainboardVersion, useMachinesModelStore().sbc!.dsf.version, true) !== 0
            ) {
              const vDiff = semver.diff(mainboardVersion, useMachinesModelStore().sbc!.dsf.version)
              if (patchDiffs.includes(vDiff)) {
                console.warn(
                  `DSF minor version mismatch (MB ${mainboardVersion} != DSF ${useMachinesModelStore().sbc!.dsf.version})`,
                )
                patchVersionMismatch = true
              } else {
                console.warn(
                  `DSF major version mismatch (MB ${mainboardVersion} != DSF ${useMachinesModelStore().sbc!.dsf.version})`,
                )
                versionMismatch = true
              }
            }

            // Check DWC version
            if (
              !versionMismatch &&
              semver.compare(mainboardVersion, packageInfo.version, true) !== 0
            ) {
              const vDiff = semver.diff(mainboardVersion, packageInfo.version)
              if (patchDiffs.includes(vDiff)) {
                console.warn(
                  `DWC minor version mismatch (MB ${mainboardVersion} != DWC ${packageInfo.version})`,
                )
                patchVersionMismatch = true
              } else {
                console.warn(
                  `DWC major version mismatch (MB ${mainboardVersion} != DWC ${packageInfo.version})`,
                )
                versionMismatch = true
              }
            }
          }

          this.shown = versionMismatch
          if (versionMismatch) {
            logToConsole(
              LogType.error,
              this.$t('dialog.incompatibleVersions.title'),
              this.$t('dialog.incompatibleVersions.prompt'),
            )
          } else if (patchVersionMismatch) {
            log(
              LogType.warning,
              this.$t('dialog.incompatibleVersions.title'),
              this.$t('dialog.incompatibleVersions.prompt'),
            )
          }
        } catch (e) {
          console.warn('Failed to check software versions', e)
        }
      }
    },
  },
})
</script>
