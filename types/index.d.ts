export type Cache = {
  /** ms epoch de la última petición al modelo (caché recién escrita/leída) */
  lastAt: number | null
  /** ms epoch del último tick, para redibujar la cuenta atrás */
  now: number
  isHidden: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'aviso-cache-fria': { cache: Cache }
  }
}
