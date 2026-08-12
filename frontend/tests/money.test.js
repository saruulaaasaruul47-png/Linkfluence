import { describe, expect, it } from 'vitest'
import { parseMoneyAmount, parseMoneyRange } from '../src/utils/money'

describe('money input parsing', () => {
  it.each([
    ['MNT 1,200,000', 1_200_000],
    ['1 200 000₮', 1_200_000],
    ['1.200.000', 1_200_000],
    ['1.2M', 1_200_000],
    ['1,2M', 1_200_000],
    [1_200_000, 1_200_000],
  ])('parses %s as a single amount', (input, expected) => {
    expect(parseMoneyAmount(input)).toBe(expected)
  })

  it.each([
    ['MNT 1,200,000 – MNT 1,500,000', 1_200_000, 1_500_000],
    ['1.2M-1.5M', 1_200_000, 1_500_000],
    ['1 200 000 to 1 500 000', 1_200_000, 1_500_000],
  ])('parses %s as a range', (input, minimum, maximum) => {
    expect(parseMoneyRange(input)).toEqual({ budgetMin: minimum, budgetMax: maximum })
  })

  it('returns undefined values for an empty amount', () => {
    expect(parseMoneyRange('')).toEqual({ budgetMin: undefined, budgetMax: undefined })
  })
})
