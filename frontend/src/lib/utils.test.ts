import { describe, expect, it } from 'vitest'
import { isValidContractFile } from './utils'

describe('isValidContractFile', () => {
  it('accepts PDF and DOCX files supported by the API', () => {
    const pdf = new File(['contract'], 'contract.PDF', { type: 'application/pdf' })
    const docx = new File(['contract'], 'contract.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    expect(isValidContractFile(pdf)).toBe(true)
    expect(isValidContractFile(docx)).toBe(true)
  })

  it('rejects legacy DOC and mismatched extensions', () => {
    const doc = new File(['contract'], 'contract.doc', { type: 'application/msword' })
    const disguised = new File(['contract'], 'contract.exe', { type: 'application/pdf' })

    expect(isValidContractFile(doc)).toBe(false)
    expect(isValidContractFile(disguised)).toBe(false)
  })
})
