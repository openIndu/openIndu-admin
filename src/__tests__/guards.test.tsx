import { describe, it, expect } from 'vitest'

// Just test that the components can be imported without errors
describe('Guards - Import Tests', () => {
  it('AuthGuard can be imported', async () => {
    const exports = await import('@/app/components/AuthGuard')
    expect(exports.AuthGuard).toBeDefined()
  })

  it('AdminGuard can be imported', async () => {
    const exports = await import('@/app/components/AdminGuard')
    expect(exports.AdminGuard).toBeDefined()
  })
})
