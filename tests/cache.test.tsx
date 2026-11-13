import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'aviso-cache-fria',
  component: 'AbovePrompt',
  props: { hasSurvey: false },
} as const

const usage = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'm' }

test('cuenta atrás: caliente, aviso y fría', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const toasts: string[] = []
  on('ui.toast', (_, e) => { toasts.push(String((e as { text?: string }).text ?? JSON.stringify(e))); return { value: {} } })
  on('ui.notify', () => ({ value: { isSent: true, channel: 'x' } }))
  on('ui.status', () => ({ value: {} }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer, usage }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'hola', turnId: 't1' } as never)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', usage } as never)

  await clock.advance(1000)
  let ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Caché caliente/ }))?.text).toContain('4:59')
  await ui.unmount()

  await clock.advance(4 * 60 * 1000 + 5000)
  ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /se enfría en/ }))?.text).toContain('0:54')
  await ui.unmount()
  expect(toasts.some(t => t.includes('se enfría'))).toBe(true)

  await clock.advance(60 * 1000)
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /Caché fría/ }))?.text).toBeTruthy()
  await ui.unmount()
  expect(toasts.some(t => t.includes('se enfrió'))).toBe(true)
})
