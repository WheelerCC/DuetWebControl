<template>
  <div class="grid grid-cols-2 gap-2">
    <Card class="col-span-full">
      <SettingsElectronicsPanel />
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>
          {{ $t('panel.settingsMachine.caption') }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsMachinePanel />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          {{ $t('panel.settingsCommunication.caption') }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsCommunicationPanel />
      </CardContent>
    </Card>

    <Tabs default-value="machine-sub-tab-0" v-model:model-value="tab" class="col-span-full">
      <TabsList class="w-full">
        <TabsTrigger :value="`machine-sub-tab-0`">
          {{ $t('panel.settingsListItems.toolTemperatures') }}
        </TabsTrigger>
        <TabsTrigger :value="`machine-sub-tab-1`">
          {{ $t('panel.settingsListItems.bedTemperatures') }}
        </TabsTrigger>
        <TabsTrigger :value="`machine-sub-tab-2`">
          {{ $t('panel.settingsListItems.chamberTemperatures') }}
        </TabsTrigger>
        <TabsTrigger :value="`machine-sub-tab-3`">
          {{ $t('panel.settingsListItems.spindleRPM') }}
        </TabsTrigger>
      </TabsList>
      <TabsContent :value="`machine-sub-tab-0`">
        <ListEditor item-key="tool" temperature />
      </TabsContent>
      <TabsContent :value="`machine-sub-tab-1`">
        <ListEditor item-key="bed" temperature />
      </TabsContent>
      <TabsContent :value="`machine-sub-tab-2`">
        <ListEditor item-key="chamber" temperature />
      </TabsContent>
      <TabsContent :value="`machine-sub-tab-3`">
        <ListEditor item-key="spindleRPM" />
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import ListEditor from '../misc/ListEditor.vue'
import SettingsCommunicationPanel from '../panels/SettingsCommunicationPanel.vue'
import SettingsElectronicsPanel from '../panels/SettingsElectronicsPanel.vue'
import SettingsMachinePanel from '../panels/SettingsMachinePanel.vue'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { ref } from 'vue'

let tab = ref('machine-sub-tab-0')
</script>
