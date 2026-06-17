import { describe, it, expect } from 'vitest'

// Just test that components can be imported - no need for render tests
describe('UI Components - Import Tests', () => {
  it('can import Button components', async () => {
    const exports = await import('@/app/components/ui/button')
    expect(exports.Button).toBeDefined()
  })

  it('can import Card components', async () => {
    const exports = await import('@/app/components/ui/card')
    expect(exports.Card).toBeDefined()
    expect(exports.CardHeader).toBeDefined()
    expect(exports.CardTitle).toBeDefined()
    expect(exports.CardContent).toBeDefined()
  })

  it('can import Input component', async () => {
    const exports = await import('@/app/components/ui/input')
    expect(exports.Input).toBeDefined()
  })

  it('can import Badge component', async () => {
    const exports = await import('@/app/components/ui/badge')
    expect(exports.Badge).toBeDefined()
  })

  it('can import cn utility', async () => {
    const exports = await import('@/app/components/ui/utils')
    expect(exports.cn).toBeDefined()
  })
})
