export function getRoute(
  route = "",
  variables: Record<string, string | number | boolean | undefined> = {}
): string {
  return Object.entries(variables).reduce(
    (acc: string, [key, value]) => acc.replaceAll(`:${key}`, value as string),
    route
  );
}
