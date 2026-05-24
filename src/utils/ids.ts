let counter = 0;

export function generateId(prefix = 'id'): string {
  counter++;
  return `${prefix}-${Date.now()}-${counter}`;
}
