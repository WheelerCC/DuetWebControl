
<script lang="ts">

import store from '@/store';
import { Axis, AxisLetter } from '@duet3d/objectmodel';
import Vue from "vue";

export default Vue.extend({
	data() {
		return {
			showMeshEditDialog: false,
			moveStepDialog: {
				shown: false,
				axis: AxisLetter.X,
				index: 0,
				preset: 0
			},
			currentWorkplace: 0
		};
	},
	computed: {
		moveSteps(): (axisLetter: AxisLetter) => Array<number> { return ((axisLetter: AxisLetter) => store.getters["machine/settings/moveSteps"](axisLetter)); },
			
		numMoveSteps(): number { return store.getters["machine/settings/numMoveSteps"]; },
		move() {
			return store.state.machine.model.move
		}, 
		tools() {
			return store.state.machine.model.tools
		},
		endstops() {
			return  store.state.machine.model.sensors.endstops
		},
		currentTool() {
			return  store.state.machine.model.state.currentTool
		},
		currentWorkOffset() {
			return  store.state.machine.model.move.workplaceNumber
		},
		visibleAxes() {
			return store.state.machine.model.move.axes.filter(axis => axis.visible);
		},
		
		workpieceOffsets() {
			// Aggregate all axes' workplaceOffsets into one table by index
			const numOffsets = 9;
			const offsets: any[][] = Array.from({ length: numOffsets }, () => [null, null, null]);

			this.visibleAxes!.forEach((axis, axisIndex) => {
				for (let i = 0; i < numOffsets; i++) {
					offsets[i][axisIndex] = axis.workplaceOffsets?.[i] ?? null;
				}
			});
			return offsets;
		},
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		
	},
	
	methods: {
		getMoveCellClass(index: number) {
			let classes = "";
			if (index === 0 || index === 5) {
				classes += "hidden-lg-and-down";
			}
			if (index > 1 && index < 4 && index % 2 === 1) {
				classes += "hidden-md-and-down";
			}
			return classes;
		},
		workpieceLabel(index: number) {
			// G54–G59.3
			if (index < 6) return `G5${4 + index}`;
			return `G59.${index - 5}`;
		},
		axisSpanClasses(axisIndex: number) {
			const classList: Array<string> = [];

			classList.push("large-font-height");

			return classList;
		},
		getMoveCode(axis: Axis, index: number, decrementing: boolean) {
			return `M120\nG91\nG1 ${/[a-z]/.test(axis.letter) ? '\'' : ""}${axis.letter}${decrementing ? '-' : ""}${this.moveSteps(axis.letter)[index]} F${store.state.machine.settings.moveFeedrate}\nM121`;
		},
		showMoveStepDialog(axis: AxisLetter, index: number) {
			this.moveStepDialog.axis = axis;
			this.moveStepDialog.index = index;
			this.moveStepDialog.preset = this.moveSteps(this.moveStepDialog.axis)[this.moveStepDialog.index];
			this.moveStepDialog.shown = true;
		},
		showSign: (value: number) => (value > 0 ? `+${value}` : value),
		async setWorkplaceAxisZero(axes: Axis[]) {
			let axesString = axes.map(axis=>`${axis.letter}0`).join(' ')
			let code = `G10 L20 P${this.currentWorkplace} ${axesString}`;
			await store.dispatch("machine/sendCode", `${code}`);
		},
		async resetWorkplaceAxisZero(axes: Axis[]) {
			let axesString = axes.map(axis=>`${axis.letter}0`).join(' ')
			let code = `G10 L2 P${this.currentWorkplace} ${axesString}`;
			await store.dispatch("machine/sendCode", `${code}`);
		},
		async selectWorkplaceOffset(index: number) {
			let code = this.workpieceLabel(index);
			await store.dispatch("machine/sendCode", `${code}`);
		},
	}
})
</script>

<template>
  <div>
    <v-row
      v-for="(axis, axisIndex) in visibleAxes"
      :key="axisIndex"
      dense
    >
      <!-- Regular home buttons -->
      <v-col
        cols="2"
        order="1"
        sm="4"
        md="1"
        order-md="1"
      >
        <v-row dense>
          <v-col>
            <code-btn
              tile
              block
              :color="axis.homed ? 'primary' : 'warning'"
              :disabled="uiFrozen"
              :title="$t('button.home.title', [/[a-z]/.test(axis.letter) ? `'${axis.letter}` : axis.letter])"
              :code="`G28 ${/[a-z]/.test(axis.letter) ? '\'' : ''}${axis.letter}`"
              class="move-btn"
            >
              {{ $t("button.home.caption", [axis.letter]) }}
            </code-btn>
          </v-col>
        </v-row>
      </v-col>

      <!-- Decreasing movements -->
      <v-col
        cols="6"
        order="3"
        md="5"
        order-md="2"
      >
        <v-row dense>
          <v-col
            v-for="index in numMoveSteps"
            :key="index"
            :class="getMoveCellClass(index - 1)"
          >
            <code-btn
              :code="getMoveCode(axis, index - 1, true)"
              no-wait
              block
              tile
              class="move-btn"
              @contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)"
            >
              <v-icon>mdi-chevron-left</v-icon>
              {{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
            </code-btn>
          </v-col>
        </v-row>
      </v-col>

      <!-- Increasing movements -->
      <v-col
        cols="6"
        order="4"
        md="5"
        order-md="3"
      >
        <v-row dense>
          <v-col
            v-for="index in numMoveSteps"
            :key="index"
            :class="getMoveCellClass(numMoveSteps - index)"
          >
            <code-btn
              :code="getMoveCode(axis, numMoveSteps - index, false)"
              no-wait
              block
              tile
              class="move-btn"
              @contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)"
            >
              {{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }}
              <v-icon>mdi-chevron-right</v-icon>
            </code-btn>
          </v-col>
        </v-row>
      </v-col>

      <!-- Set axis-->
      <v-col
        cols="2"
        order="2"
        offset="8"
        sm="4"
        offset-sm="4"
        md="1"
        order-md="4"
        offset-md="0"
      >
        <v-row dense>
          <v-col>
            <code-btn
              color="warning"
              tile
              block
              :code="`G10 L20 P${currentWorkplace} ${axis.letter}0`"
              class="move-btn"
            >
              {{ $t("panel.movement.set", [axis.letter]) }}
            </code-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
		
    <v-row>
      <v-col>
        <v-card>
          <v-card-title class="py-2">
            <strong>
              Tool Offsets
            </strong>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col>
                <v-simple-table>
                  <thead>
                    <tr>
                      <th class="text-left">
                        Tool
                      </th>
                      <th 
                        v-for="(axis, index) in visibleAxes"
                        :key="index" 
                        class=""
                      >
                        {{ axis.letter }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="tool in tools"
                      :key="tool?.number"
                      :class="{ selected: tool?.number === currentTool , notselected: tool?.number !== currentTool }"
                    >
                      <td>{{ `T${tool?.number}` }}</td>
                      <td 
                        v-for="(axis, index) in visibleAxes"
                        :key="index" 
                      >
                        {{ tool?.offsets[index]?.toFixed(3) ?? '—' }}
                      </td>
                    </tr>
                  </tbody>
                </v-simple-table>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card> 
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-card> 
          <v-card-title class="py-2">
            <strong>
              Workplace Offsets
            </strong>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col>
                <v-simple-table>
                  <thead>
                    <tr>
                      <th class="text-center">
                        Offset
                      </th>
                      <th 
                        v-for="(axis, index) in visibleAxes"
                        :key="index" 
                        class="text-center"
                      >
                        {{ axis.letter }}
                      </th>
											
                      <th class="text-center" />
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(offset, index) in workpieceOffsets"
                      :key="index"
                      :class="{ selected: index === currentWorkOffset, notselected: index !== currentWorkOffset }"
                    >
                      <td>
                        <div class="pa-4 d-flex align-center">
                          <v-spacer />
                          <v-btn
                            block
                            class=""
                            @click="selectWorkplaceOffset(index)"
                          >
                            {{ workpieceLabel(index) }}
                          </v-btn>
                          <v-spacer />
                        </div>
                      </td>
											
                      <td 
                        v-for="(axis, _index) in visibleAxes"
                        :key="_index" 
                      >
                        <div class="pa-4 d-flex align-center">
                          <v-spacer />
                          <span class="">
                            {{ offset[_index]?.toFixed(3) ?? '—' }}
                          </span>
                          <v-btn
                            class="ml-10"
                            @click="setWorkplaceAxisZero([axis])"
                          >
                            {{ 'Set ' + [axis.letter] }}
                          </v-btn>
													
                          <v-btn
                            class="ml-1"
                            @click="resetWorkplaceAxisZero([axis])"
                          >
                            {{ 'Reset' }}
                          </v-btn>
                          <v-spacer />
                        </div>
                      </td>
											
                      <td>
                        <v-btn
                          block
                          class="move-btn"
                          @click="setWorkplaceAxisZero(visibleAxes)"
                        >
                          {{ 'Set XYZ' }}
                        </v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-simple-table>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card> 
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.selected {
	font-weight: bold;
}
.notselected {
	opacity: 0.3;
}

</style>