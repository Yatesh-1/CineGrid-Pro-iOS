import { Suspense, lazy, type ComponentType } from 'react';

/**
 * Loads a component's code on demand (in its own chunk) but keeps the same props and JSX at the call site.
 * Panels that are rarely opened therefore do not slow down the first screen. The fallback is empty on purpose:
 * these are overlays/panels, and the camera screen underneath must never be blocked while they load.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyView<C extends ComponentType<any>>(loader: () => Promise<{ default: C }>): C {
  const Inner = lazy(loader) as unknown as ComponentType<Record<string, unknown>>;
  const Wrapped = (props: Record<string, unknown>) => (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
  return Wrapped as unknown as C;
}
