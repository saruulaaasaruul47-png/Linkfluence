import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('creator, business and campaign fixture modules are not shipped', () => {
  for (const filename of ['marketplace.js', 'dashboard.js', 'admin.js']) {
    assert.equal(
      fs.existsSync(path.join(frontendRoot, 'src', 'data', filename)),
      false,
      `${filename} must not reintroduce static marketplace records`,
    )
  }
})

test('active marketplace screens do not use demo channel or stock profile fallbacks', () => {
  const dashboard = fs.readFileSync(
    path.join(frontendRoot, 'src', 'components', 'dashboard', 'DashboardLayout.jsx'),
    'utf8',
  )
  const profiles = fs.readFileSync(
    path.join(frontendRoot, 'src', 'pages', 'marketplace', 'ProfilePages.jsx'),
    'utf8',
  )

  for (const forbidden of ['Amara Bat', 'Northstar Studio', 'defaultChannels']) {
    assert.equal(dashboard.includes(forbidden), false, `${forbidden} is a demo dashboard fallback`)
  }
  for (const forbidden of ['placeholderAvatar', 'placeholderCover', 'defaultCreatorSkills', 'creatorProcess']) {
    assert.equal(profiles.includes(forbidden), false, `${forbidden} is a fabricated profile fallback`)
  }
})
