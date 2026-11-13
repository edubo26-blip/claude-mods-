import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Cache } from '../types'

const cache = atom({ plugin: 'aviso-cache-fria', key: 'cache' } as const, {
  lastAt: null,
  now: 0,
  isHidden: false,
} as Cache)

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export const register: Register = (on, options) => {
  const ttlMs = options.ttl === '1h' ? 60 * 60 * 1000 : 5 * 60 * 1000
  const warnMs = (Number(options.avisoAntes) || 60) * 1000

  let isBusy = false
  let hasWarned = false
  let hasColdNotice = false
  let tick: { cancel: () => void } | undefined

  const reset = () => {
    hasWarned = false
    hasColdNotice = false
  }

  on('session.start', async ($, e, next) => {
    const r = await next(e)
    tick?.cancel()
    tick = $.clock.every(1000, async () => {
      const c = await read($, cache)
      if (c.lastAt === null || isBusy) return
      const t = await $.clock.now()
      const left = c.lastAt + ttlMs - t

      if (left <= 0) {
        if (!hasColdNotice) {
          hasColdNotice = true
          $.ui.toast('❄️ La caché se enfrió: el próximo mensaje se cobrará sin caché.')
          $.ui.notify('La caché se enfrió: el próximo mensaje irá sin caché.', { title: 'Caché fría' })
          $.ui.status('❄️ caché fría')
          await update($, cache, x => ({ ...x, now: t }))
        }
        return
      }

      if (left <= warnMs && !hasWarned) {
        hasWarned = true
        $.ui.toast(`⏳ La caché se enfría en ${fmt(left)}. Escribe ahora para aprovecharla.`)
        $.ui.notify(`La caché se enfría en ${fmt(left)}.`, { title: 'Caché a punto de enfriarse' })
      }
      $.ui.status(`${left <= warnMs ? '⏳' : '🔥'} caché ${fmt(left)}`)
      await update($, cache, x => ({ ...x, now: t }))
    })
    return r
  })

  on('turn.start', async ($, e, next) => {
    if (!e.agentId) isBusy = true
    return next(e)
  })

  // Cada petición al modelo del hilo principal escribe/lee la caché.
  on('turn.step', async function* ($, e, next) {
    const r = yield* next(e)
    if (!e.agentId) {
      const t = await $.clock.now()
      reset()
      await update($, cache, c => ({ ...c, lastAt: t, now: t, isHidden: false }))
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId) {
      isBusy = false
      if (e.usage) {
      const t = await $.clock.now()
      reset()
      await update($, cache, c => ({ ...c, lastAt: t, now: t, isHidden: false }))
    }
    }
    return r
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const c = await read($, cache)
    if (e.props.hasSurvey || c.lastAt === null || c.isHidden || isBusy) return next(e)

    const left = c.lastAt + ttlMs - c.now
    const { Box, Button, Text } = $.ui.resolve(e)
    const hide = (
      <Button key="ocultar" label="Ocultar" onPress={() => update($, cache, x => ({ ...x, isHidden: true }))} />
    )

    if (left <= 0) {
      return (
        <Box>
          <Text color="cyan">❄️ Caché fría: el próximo mensaje irá sin caché (más lento y caro). </Text>
          {hide}
        </Box>
      )
    }
    if (left <= warnMs) {
      return (
        <Box>
          <Text color="yellow">⏳ La caché se enfría en {fmt(left)}. Escribe ahora para aprovecharla. </Text>
          {hide}
        </Box>
      )
    }
    return (
      <Box>
        <Text dimColor>🔥 Caché caliente: {fmt(left)} </Text>
        {hide}
      </Box>
    )
  })
}
