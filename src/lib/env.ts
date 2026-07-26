export function cleanEnv(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/^\uFEFF/, '').trim();
}
