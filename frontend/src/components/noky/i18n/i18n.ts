export const N_ = (s: string) => s;
export const labels = (o: any) => o;
export const t = (s: string) => s;
export const tl = (s: any) => typeof s === 'string' ? s : s.toString();
export const language = () => 'en';
export function isRtl() { return false; }
export function setLanguage(l: string) {}
export function resolveLanguage(l: string, s: string[]) { return 'en'; }
export function systemLanguages() { return ['en']; }
