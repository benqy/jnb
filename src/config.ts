// PROJECT_ROOT: prefix for public/ resources. Uses Vite base or '/'.
const _base = import.meta.env.BASE_URL ?? '/';
export const PROJECT_ROOT = _base.endsWith('/') ? _base : _base + '/';

// Usage: `Assets.load(`${PROJECT_ROOT}images/hero.png`)`
