export type ChainInputSource =
  | { source: 'literal'; value: string }
  | { source: 'chain_input'; paramName: string }
  | { source: 'step_output'; stepId: string; jsonPath: string }
