import { describe, it, expect } from 'vitest'
import { cn } from '@/app/components/ui/utils'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('p-4', 'm-2')
    expect(result).toBe('p-4 m-2')
  })

  it('resolves tailwind conflicts with tailwind-merge', () => {
    // Later classes should override earlier ones for the same property
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })

  it('handles conditional classes', () => {
    const result = cn('p-4', { 'm-2': true, 'hidden': false })
    expect(result).toBe('p-4 m-2')
  })

  it('handles undefined and null values', () => {
    const result = cn('p-4', undefined, null, 'm-2')
    expect(result).toBe('p-4 m-2')
  })

  it('handles arrays of classes', () => {
    const result = cn('p-4', ['m-2', 'flex'])
    expect(result).toBe('p-4 m-2 flex')
  })

  it('returns empty string when no inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles complex nested inputs', () => {
    const result = cn(
      'p-4',
      ['m-2', 'flex'],
      { 'bg-red-500': true, 'hidden': false },
      undefined,
      null
    )
    expect(result).toBe('p-4 m-2 flex bg-red-500')
  })
})
