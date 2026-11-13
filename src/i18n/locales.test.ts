import { describe, expect, it } from 'vitest'

import en from './locales/en.json'
import fr from './locales/fr.json'

type TranslationTree = { [key: string]: string | TranslationTree }

function flattenKeys(value: TranslationTree, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof child === 'string' ? [path] : flattenKeys(child, path)
  })
}

describe('translation catalogs', () => {
  it('contain the same keys in French and English', () => {
    expect(flattenKeys(fr).sort()).toEqual(flattenKeys(en).sort())
  })
})
