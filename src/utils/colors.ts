const heaterColors = [
  'primary',
  'red',
  'green',
  'orange',
  'grey',
  'lime',
  'black',
  'purple',
  'yellow',
  'teal',
  'brown',
  'deep-orange',
  'pink',
  'blue-grey',
]

export function getHeaterColor(heaterIndex: number) {
  return heaterColors[heaterIndex % heaterColors.length] + '--text'
}

export function getExtraColor(sensorIndex: number) {
  return heaterColors[(heaterColors.length - sensorIndex - 1) % heaterColors.length] + '--text'
}

export function getRealHeaterColor(heaterIndex: number, isExtra: boolean) {
  return isExtra ? getExtraColor(heaterIndex) : getHeaterColor(heaterIndex);
}
