/**
 * Lazy singleton. Keep `Proxy` out of `prisma.ts`: Turbopack rewrites
 * `new Proxy` to `new Prisma` next to a `PrismaClient` import, which crashes
 * with `ReferenceError: Prisma is not defined`.
 */
export function lazyObject<T extends object>(getTarget: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const instance = getTarget();
      const value = Reflect.get(instance, property, instance);
      if (typeof value === "function") {
        return value.bind(instance);
      }
      return value;
    },
  });
}
