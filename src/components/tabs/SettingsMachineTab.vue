<template>
  <!-- <SettingsElectronicsPanel /> -->

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

  <!-- <SettingsCommunicationPanel />

  <SettingsListItemsPanel /> -->
</template>

<script setup lang="ts">
// import SettingsCommunicationPanel from '../panels/SettingsCommunicationPanel.vue'
// import SettingsElectronicsPanel from '../panels/SettingsElectronicsPanel.vue'
// import SettingsListItemsPanel from '../panels/SettingsListItemsPanel.vue'
import SettingsMachinePanel from '../panels/SettingsMachinePanel.vue'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
</script>
