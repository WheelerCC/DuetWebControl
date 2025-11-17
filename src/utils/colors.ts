function heaterColors(css: CSSStyleDeclaration) {
  return [
    css.getPropertyValue('--heater-a'),
    css.getPropertyValue('--heater-b'),
    css.getPropertyValue('--heater-c'),
    css.getPropertyValue('--heater-d'),
    css.getPropertyValue('--heater-e'),
    css.getPropertyValue('--heater-f'),
    css.getPropertyValue('--heater-g'),
    css.getPropertyValue('--heater-h'),
    css.getPropertyValue('--heater-i'),
    css.getPropertyValue('--heater-j'),
    css.getPropertyValue('--heater-k'),
    css.getPropertyValue('--heater-l'),
    css.getPropertyValue('--heater-m'),
  ]
}

export function getHeaterColor(heaterIndex: number, css: CSSStyleDeclaration) {
  let colours = heaterColors(css)
  return colours[heaterIndex % colours.length]
}

export function getExtraColor(sensorIndex: number, css: CSSStyleDeclaration) {
  let colours = heaterColors(css)
  return colours[(colours.length - sensorIndex - 1) % colours.length]
}

export function getRealHeaterColor(heaterIndex: number, isExtra: boolean, css: CSSStyleDeclaration) {
  // return css.getPropertyValue('--heater-1');
  return isExtra ? getExtraColor(heaterIndex, css) : getHeaterColor(heaterIndex, css)
}
