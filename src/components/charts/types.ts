import { ChartDataset } from "chart.js"

/**
 * Extra values for Chart.JS dataset values
 */
interface ExtraDatasetValues {
  /**
   * Index of the sensor
   */
  index: number

  /**
   * Whether this is an extra sensor
   */
  sensorType: "heater" | "sensor"

  /**
   * Locale used when rendering
   */
  locale: string

  /**
   * Raw label of this dataset (equal to to sensor.name)
   */
  rawLabel: string | null
}

/**
 * Type used for chart datasets in this component
 */
export type TempChartDataset = ChartDataset<"line", number[]> & ExtraDatasetValues & { showLine: boolean }


/**
 * Temperature samples to save per connected machine
 */
export interface TempSampleData {
  times: number[]
  temps: TempChartDataset[]
}

// /**
//  * Collection of machines vs. collected temp samples
//  */
// const tempSamples: Record<string, TempSampleData> = {
//   [defaultMachine]: {
// 	times: [],
// 	temps: [],
//   },
// }

