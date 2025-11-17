<template>
  <div class="grid grid-cols-3 gap-2">
    <div class="flex flex-col gap-2">
      <Card class="gap-2">
        <CardHeader>
          <CardTitle class="">
            <a
              href="https://github.com/Duet3D/DuetWebControl"
              :title="$t('panel.settingsAbout.buildDateTime', [buildDateTime])"
              class="flex flex-row items-center w-full"
            >
              <div class="flex flex-col">
                DuetWebControl
                <div class="text-xs">
                  GPL-3.0 licence{{
                    dwcRepo.latestVersion ? `/ ${dwcRepo.latestVersion.value}` : ''
                  }}
                </div>
              </div>

              <div class="mx-auto">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Badge
                        :variant="
                          dwcRepo.latestVersion.value &&
                          dwcRepo.latestVersion.value != `v${version}`
                            ? 'destructive'
                            : 'secondary'
                        "
                        class="text-lg"
                      >
                        {{ version }}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p
                        v-if="
                          dwcRepo.latestVersion.value &&
                          dwcRepo.latestVersion.value != `v${version}`
                        "
                      >
                        New version if available
                      </p>
                      <p v-else>Up to date</p>
                      <!-- TODO international -->
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <a class="flex flex-row gap-1 items-center" v-if="dwcRepo.stars">
                <StarIcon :size="18" class="ml-auto" />
                {{ dwcRepo.stars }}
              </a>
            </a>
          </CardTitle>
          <Separator class="mt-2" />
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-2 w-full">
            <a
              href="https://github.com/Duet3D/RepRapFirmware"
              class="flex flex-row items-center w-full"
            >
              <div class="flex flex-col">
                RepRapFirmware
                <div class="text-xs">
                  GPL-3.0 licence
                  {{ rrfRepo.latestVersion.value ? `/ ${rrfRepo.latestVersion.value}` : '' }}
                </div>
              </div>

              <a class="ml-auto flex flex-row gap-1 items-center" v-if="rrfRepo.stars">
                <StarIcon :size="14" class="ml-auto" />
                {{ rrfRepo.stars }}
              </a>
            </a>

            <a
              href="https://github.com/Duet3D/DuetSoftwareFramework"
              class="flex flex-row items-center w-full"
            >
              <div class="flex flex-col">
                DuetSoftwareFramework
                <div class="text-xs">
                  GPL-3.0 licence
                  {{ dsfRepo.latestVersion.value ? `/ ${dsfRepo.latestVersion.value}` : '' }}
                </div>
              </div>

              <a class="ml-auto flex flex-row gap-1 items-center" v-if="dsfRepo.stars">
                <StarIcon :size="14" class="ml-auto" />
                {{ dsfRepo.stars }}
              </a>
            </a>

            <a
              href="https://github.com/Duet3D/PluginRepository"
              class="flex flex-row items-center w-full"
            >
              <div class="flex flex-col">
                PluginRepository
                <div class="text-xs">
                  GPL-3.0 licence
                  {{ pluginRepo.latestVersion.value ? `/ ${pluginRepo.latestVersion.value}` : '' }}
                </div>
              </div>

              <a class="ml-auto flex flex-row gap-1 items-center" v-if="pluginRepo.stars">
                <StarIcon :size="14" class="ml-auto" />
                {{ pluginRepo.stars }}
              </a>
            </a>

            <a
              href="https://github.com/Duet3D/ConfigTool"
              class="flex flex-row items-center w-full"
            >
              <div class="flex flex-col">
                ConfigTool
                <div class="text-xs">
                  ??? licence
                  {{
                    configToolRepo.latestVersion.value
                      ? `/ ${configToolRepo.latestVersion.value}`
                      : ''
                  }}
                </div>
              </div>

              <a class="ml-auto flex flex-row gap-1 items-center" v-if="configToolRepo.stars">
                <StarIcon :size="14" class="ml-auto" />
                {{ configToolRepo.stars }}
              </a>
            </a>

            <a
              href="https://github.com/Duet3D/PanelDueFirmware"
              class="flex flex-row items-center w-full"
            >
              <div class="flex flex-col">
                PanelDueFirmware
                <div class="text-xs">
                  GPL-3.0 licence*
                  {{
                    panelDueRepo.latestVersion.value ? `/ ${panelDueRepo.latestVersion.value}` : ''
                  }}
                </div>
              </div>

              <a class="ml-auto flex flex-row gap-1 items-center" v-if="panelDueRepo.stars">
                <StarIcon :size="14" class="ml-auto" />
                {{ panelDueRepo.stars }}
              </a>
            </a>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle> {{ $t('panel.settingsAppearance.caption') }} </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsAppearancePanel />
        </CardContent>
      </Card>
    </div>

    <div class="col-span-2 flex flex-col gap-2">
      <Card>
        <SettingsGeneralPanel />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {{ $t('panel.settingsNotifications.caption') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsNotificationsPanel />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {{ $t('panel.settingsWebcam.caption') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsWebcamPanel />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {{ $t('panel.settingsBehaviour.caption') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsBehaviourPanel />
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import packageInfo from '../../../package.json'
import SettingsAppearancePanel from '../panels/SettingsAppearancePanel.vue'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

import { useFetch } from '@vueuse/core'
import { StarIcon } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import SettingsBehaviourPanel from '../panels/SettingsBehaviourPanel.vue'
import SettingsGeneralPanel from '../panels/SettingsGeneralPanel.vue'
import SettingsNotificationsPanel from '../panels/SettingsNotificationsPanel.vue'
import SettingsWebcamPanel from '../panels/SettingsWebcamPanel.vue'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'

let buildDateTime = ref(process.env.BUILD_DATETIME)
let version = ref(packageInfo.version)

function useGitHubRepo(repoPath: string) {
  const { data, error } = useFetch(`https://ungh.cc/repos/${repoPath}`).get().json()
  const { data: releaseData, error: releaseError } = useFetch(
    `https://ungh.cc/repos/${repoPath}/releases/latest`,
  )
    .get()
    .json()

  const stars = computed<Number | null>(() => {
    if (error.value || !data.value) return null
    return data.value?.repo?.stars ? Number(data.value?.repo?.stars) : null
  })

  const latestVersion = computed<string | null>(() => {
    if (releaseError.value || !releaseData.value) return null
    return releaseData.value?.release?.tag ? String(releaseData.value?.release?.tag) : null
  })

  return {
    data,
    error,
    stars,
    releaseData,
    releaseError,
    latestVersion,
  }
}

const dwcRepo = useGitHubRepo('Duet3D/DuetWebControl')
const rrfRepo = useGitHubRepo('Duet3D/RepRapFirmware')
const dsfRepo = useGitHubRepo('Duet3D/DuetSoftwareFramework')
const pluginRepo = useGitHubRepo('Duet3D/PluginRepository')
const panelDueRepo = useGitHubRepo('Duet3D/PanelDueFirmware')
const configToolRepo = useGitHubRepo('Duet3D/ConfigTool')
</script>
