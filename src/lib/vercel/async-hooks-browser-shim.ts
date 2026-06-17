type StoreCallback<T> = (...args: unknown[]) => T;

export class AsyncLocalStorage<TStore = unknown> {
  getStore(): TStore | undefined {
    return undefined;
  }

  run<TResult>(store: TStore, callback: StoreCallback<TResult>, ...args: unknown[]): TResult {
    void store;
    return callback(...args);
  }

  enterWith(store: TStore): void {
    void store;
  }

  disable(): void {}
}
