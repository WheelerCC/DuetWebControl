<style scoped>
.axis-span {
	border-radius: 5px;
}

@media screen and (max-width: 600px) {
	.large-font-height {
		/* height: 35px; */
	}

	.large-font {
		font-size: 30px;
	}
}

@media screen and (min-width: 601px) {
	.large-font-height {
		/* height: 55px; */
	}

	.large-font {
		font-size: 75px;
	}
}
</style>

<template>
	<v-card class="py-0">
		<v-card-title class="py-2">
			<strong>
				{{ machinePosition ? $t("panel.status.machinePosition") : $t("panel.status.toolPosition") }} {{ machinePosition ? '' : `(T${currentTool})` }}
			</strong>
		</v-card-title>
		<v-card-text>
			<v-row align-content="center" no-gutters :class="{ 'large-font' : !machinePosition }">
				<v-col v-for="(axis, index) in visibleAxes" :key="axis.letter" class="d-flex flex-column align-center">
					<span v-if="machinePosition" class="axis-span" :class="axisSpanClasses(index)">
						{{ axis.letter }}
					</span>
					<v-container v-if="!machinePosition">
						<v-row no-gutters >
							<v-col
								cols="2"
								fill-height
							>
								<span
								class="fill-height axis-span"
								align-content-center
								:style="{ overflow: 'hidden', 'font-size': '2vw' , display: 'flex', alignItems: 'center', justifyContent: 'center'}"
								>
									{{ axis.letter }}
								</span>
							</v-col>
							<v-col
								cols="2"
								fill-height
							>
								<span
								:style="{ overflow: 'hidden', 'font-size': '0.8vw', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: 'monospace'}"
								>
									<!-- Should use display(...) or store.state.settings.decimalPlaces -->
									{{ `${axis.machinePosition?.toFixed(3)}` }}

						</span>
								<span
								:style="{ overflow: 'hidden', 'font-size': '0.8vw', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: 'monospace'}"
								>
									<!-- Should use display(...) or store.state.settings.decimalPlaces -->
									{{ `-${axis.workplaceOffsets[currentWorkOffset].toFixed(3)}` }}
								</span>
								<span
								:style="{ overflow: 'hidden', 'font-size': '0.8vw', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: 'monospace'}"
								>
								<!-- Should use display(...) or store.state.settings.decimalPlaces -->
									{{ `${tools[currentTool]?.offsets[index].toFixed(3)}` }} 
								</span>
							</v-col>
							<v-col
								cols="8"
								fill-height
							>
								<span
								class="fill-height"
								align-content-center
								:style="{ overflow: 'hidden', 'font-size': '3vw', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '20px', fontWeight: 'lighter', fontFamily: 'monospace'}"
								>
										{{ $displayAxisPosition(axis, machinePosition) }}
								</span>
							</v-col>
						</v-row>
					</v-container>
					<div v-else>
						{{ $displayAxisPosition(axis, machinePosition) }}
					</div>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { Axis } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	props: {
		machinePosition: {
			type: Boolean,
			required: true
		}
	},
	computed: {
		darkTheme(): boolean {
			return store.state.settings.darkTheme;
		},
		visibleAxes(): Array<Axis> {
			return store.state.machine.model.move.axes.filter(axis => axis.visible);
		},
		currentTool(): number {
			return store.state.machine.model.state.currentTool
		},
		currentWorkOffset() {
			return  store.state.machine.model.move.workplaceNumber
		},
		tools() {
			return store.state.machine.model.tools
		},
	},
	methods: {
		axisSpanClasses(axisIndex: number) {
			const classList: Array<string> = [];
			if (this.machinePosition) {
				if (axisIndex >= 0 && axisIndex < store.state.machine.model.sensors.endstops.length && store.state.machine.model.sensors.endstops[axisIndex]?.triggered) {
					classList.push("px-2");
					classList.push("light-green");
					classList.push(this.darkTheme ? "darken-3" : "lighten-4");
				}
			} else {
				classList.push("large-font-height");
			}
			return classList;
		}
	}
});
</script>

