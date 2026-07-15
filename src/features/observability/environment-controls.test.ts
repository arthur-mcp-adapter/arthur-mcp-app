import { describe, it, expect } from 'vitest'
import {
  defaultEnvironmentValues,
  formatEnvironmentValue,
  mergeEnvironmentValues,
  serializeEnvironmentValues,
} from './utils'
import { ENVIRONMENT_CONTROLS } from './environmentControls.constant'

describe('observability environment controls', () => {
  it('builds defaults from every declared control', () => {
    expect(defaultEnvironmentValues()).toEqual(
      Object.fromEntries(ENVIRONMENT_CONTROLS.map((control) => [control.name, control.defaultValue])),
    )
  })

  it('merges persisted values with defaults and stringifies unknown shapes', () => {
    expect(mergeEnvironmentValues()).toEqual(defaultEnvironmentValues())
    expect(mergeEnvironmentValues({
      ENABLE_METRICS: 'false',
      SERVICE_NAME: 'custom-service',
      IGNORED: 'value',
    })).toEqual({
      ...defaultEnvironmentValues(),
      ENABLE_METRICS: 'false',
      SERVICE_NAME: 'custom-service',
    })
  })

  it('formats and serializes env values', () => {
    expect(formatEnvironmentValue('')).toBe('""')
    expect(formatEnvironmentValue('abc')).toBe('abc')
    expect(serializeEnvironmentValues({
      ENABLE_METRICS: 'false',
      SERVICE_NAME: 'arthur',
      SERVICE_VERSION: '',
      PROMETHEUS_METRICS_PATH: '/custom',
    })).toBe([
      'ENABLE_METRICS=false',
      'SERVICE_NAME=arthur',
      'SERVICE_VERSION=""',
      'PROMETHEUS_METRICS_PATH=/custom',
    ].join('\n'))
  })
})
