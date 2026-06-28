import { Provider } from '@nestjs/common';
import { Registry } from 'prom-client';

export const PROMETHEUS_REGISTRY = Symbol('PROMETHEUS_REGISTRY');

export const prometheusRegistryProvider: Provider = {
  provide: PROMETHEUS_REGISTRY,
  useFactory: () => new Registry(),
};
