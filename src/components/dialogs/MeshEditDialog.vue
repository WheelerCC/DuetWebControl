<template>
  <v-dialog v-model="innerShown" max-width="600px" persistent no-click-animation>
    <v-card>
      <v-form ref="form" @submit.prevent="apply">
        <v-card-title>
          <span class="headline">
            {{ $t('dialog.meshEdit.title') }}
          </span>
        </v-card-title>

        <v-card-text>
          <v-row v-if="isDelta">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="radius"
                type="number"
                :label="$t('dialog.meshEdit.radius')"
                required
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="spacingX"
                type="number"
                :label="$t('dialog.meshEdit.spacing')"
                required
                hide-details
              />
            </v-col>
          </v-row>
          <v-row v-else>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="minX"
                type="number"
                :label="$t('dialog.meshEdit.startCoordinate', [xAxis])"
                required
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="maxX"
                type="number"
                :label="$t('dialog.meshEdit.endCoordinate', [xAxis])"
                required
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="minY"
                type="number"
                :label="$t('dialog.meshEdit.startCoordinate', [yAxis])"
                required
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="maxY"
                type="number"
                :label="$t('dialog.meshEdit.endCoordinate', [yAxis])"
                required
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="spacingX"
                type="number"
                :label="$t('dialog.meshEdit.spacingDirection', [xAxis])"
                required
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="spacingY"
                type="number"
                :label="$t('dialog.meshEdit.spacingDirection', [yAxis])"
                required
                hide-details
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="blue darken-1" text @click="hide">
            {{ $t('generic.cancel') }}
          </v-btn>
          <v-btn color="blue darken-1" text type="submit">
            {{ $t('generic.ok') }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { KinematicsName, ProbeGrid } from '@duet3d/objectmodel'

import { defineComponent } from 'vue'

export default defineComponent({
  compatConfig: {
    MODE: 2,
  },
  props: {
    shown: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      xAxis: 'X',
      yAxis: 'Y',
      maxX: 200,
      maxY: 200,
      minX: 0,
      minY: 0,
      radius: 150,
      spacingX: 20,
      spacingY: 20,
      innerShown: this.shown,
    }
  },
  computed: {
    probeGrid(): ProbeGrid {
      return useMachinesModelStore().move.compensation.probeGrid
    },
    isDelta(): boolean {
      return [KinematicsName.delta, KinematicsName.rotaryDelta].includes(
        useMachinesModelStore().move.kinematics.name,
      )
    },
  },
  watch: {
    shown(to: boolean) {
      if (this.innerShown !== to) {
        this.innerShown = to
      }
      if (to) {
        this.xAxis = this.probeGrid.axes.length > 0 ? this.probeGrid.axes[0] : 'X'
        this.yAxis = this.probeGrid.axes.length > 1 ? this.probeGrid.axes[1] : 'Y'
        this.maxX = this.probeGrid.maxs.length > 0 ? this.probeGrid.maxs[0] : 0
        this.maxY = this.probeGrid.maxs.length > 1 ? this.probeGrid.maxs[1] : 0
        this.minX = this.probeGrid.mins.length > 0 ? this.probeGrid.mins[0] : 0
        this.minY = this.probeGrid.mins.length > 1 ? this.probeGrid.mins[1] : 0
        this.radius = this.probeGrid.radius
        this.spacingX = this.probeGrid.spacings.length > 0 ? this.probeGrid.spacings[0] : 0
        this.spacingY = this.probeGrid.spacings.length > 1 ? this.probeGrid.spacings[1] : 0
      }
    },
    innerShown(to: boolean) {
      if (this.shown !== to) {
        this.$emit('update:shown', to)
      }
    },
  },
  methods: {
    async apply() {
      if ((this.$refs.form as HTMLFormElement).validate()) {
        this.hide()

        if (this.isDelta) {
          await useMachinesStore().sendCode(`M557 R${this.radius} S${this.spacingX}`)
        } else {
          await useMachinesStore().sendCode(
            `M557 X${this.minX}:${this.maxX} Y${this.minY}:${this.maxY} S${this.spacingX}:${this.spacingY}`,
          )
        }
      }
    },
    hide() {
      this.innerShown = false
    },
  },
})
</script>
