export function required(value, label = 'This field') {
  return String(value ?? '').trim() ? '' : `${label} is required.`
}

export function validEmail(value) {
  if (!String(value || '').trim()) return 'Email is required.'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Enter a valid email address.'
}

export function minLength(value, length, label = 'This field') {
  return String(value ?? '').trim().length >= length ? '' : `${label} must be at least ${length} characters.`
}

export function validate(schema, values) {
  return Object.entries(schema).reduce((errors, [key, validators]) => {
    for (const validator of validators) {
      const message = validator(values[key], values)
      if (message) {
        errors[key] = message
        break
      }
    }
    return errors
  }, {})
}
