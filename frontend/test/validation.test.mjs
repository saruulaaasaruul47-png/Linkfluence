import test from 'node:test'
import assert from 'node:assert/strict'
import { minLength, required, validEmail, validate } from '../src/lib/validation.js'

test('required rejects blank values', () => {
  assert.equal(required('  ', 'Reason'), 'Reason is required.')
  assert.equal(required('valid', 'Reason'), '')
})

test('email validator accepts normal email and rejects malformed input', () => {
  assert.equal(validEmail('creator@vyra.mn'), '')
  assert.equal(validEmail('creator@'), 'Enter a valid email address.')
})

test('schema validation returns first error per field', () => {
  const errors = validate({
    title: [(value) => required(value, 'Title'), (value) => minLength(value, 4, 'Title')],
  }, { title: '' })
  assert.deepEqual(errors, { title: 'Title is required.' })
})
