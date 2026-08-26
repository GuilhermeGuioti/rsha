export type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campo?: string };
