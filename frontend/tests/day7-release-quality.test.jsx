import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import { RouteMeta } from '../src/components/RouteMeta.jsx'
import { usePageSeo } from '../src/hooks/usePageSeo.js'
import { FeedCard } from '../src/components/marketplace/ShowcaseFeed.jsx'
import { Dialog } from '../src/components/ui/Dialog.jsx'
import { FileUpload } from '../src/components/ui/FileUpload.jsx'
import { FilterSidebar } from '../src/components/marketplace/SearchFilters.jsx'
import { StatusBadge } from '../src/components/dashboard/DashboardUI.jsx'

function DynamicSeo() {
  usePageSeo({
    title: 'Amara Bat · Creator on VYRA',
    description: 'Fashion creator in Ulaanbaatar.',
    canonicalPath: '/creators/amara-bat',
    image: '/uploads/amara.jpg',
    type: 'profile',
    jsonLd: { '@context': 'https://schema.org', '@type': 'Person', name: 'Amara Bat' },
  })
  return null
}

function DialogHarness() {
  const [open, setOpen] = useState(false)
  return <><button type="button" onClick={() => setOpen(true)}>Open settings</button><Dialog open={open} onClose={() => setOpen(false)} title="Settings"><button type="button">Save settings</button></Dialog></>
}

function FilterHarness() {
  const [filters, setFilters] = useState({})
  return <FilterSidebar type="creator" filters={filters} setFilters={setFilters} />
}

const feedItem = {
  id: 'post-1',
  postId: 'post-1',
  ownerKey: 'creator:amara',
  saveKey: 'content:post-1',
  title: 'City in motion',
  copy: 'A short creator story.',
  author: 'Amara Bat',
  fallback: 'AB',
  type: 'Creator work',
  label: 'Fashion',
  metric: '12 likes',
  mediaType: 'IMAGE',
  image: '/work.jpg',
  likes: 12,
}

describe('Day 7 metadata and accessibility release gate', () => {
  test('private routes are noindex with canonical metadata', async () => {
    render(<MemoryRouter initialEntries={['/admin/dashboard']}><RouteMeta /></MemoryRouter>)
    await waitFor(() => expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', expect.stringContaining('noindex')))
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'http://localhost:3000/admin/dashboard')
  })

  test('public entity metadata includes OpenGraph, canonical and valid JSON-LD', async () => {
    render(<DynamicSeo />)
    await waitFor(() => expect(document.title).toBe('Amara Bat · Creator on VYRA'))
    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute('content', 'Amara Bat · Creator on VYRA')
    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'http://localhost:3000/uploads/amara.jpg')
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'http://localhost:3000/creators/amara-bat')
    expect(JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)).toMatchObject({ '@type': 'Person', name: 'Amara Bat' })
  })

  test('dialog traps focus, closes with Escape and restores trigger focus', async () => {
    render(<DialogHarness />)
    const trigger = screen.getByRole('button', { name: 'Open settings' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(await screen.findByRole('dialog', { name: 'Settings' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  test('feed like, save and follow actions expose their current pressed state', () => {
    render(<FeedCard item={feedItem} following={['creator:amara']} saved={['content:post-1']} liked onFollow={vi.fn()} onSave={vi.fn()} onLike={vi.fn()} onOpen={vi.fn()} onOpenProfile={vi.fn()} canInteract />)
    expect(screen.getByRole('button', { name: 'Unlike City in motion' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Remove City in motion from saved' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('button', { name: 'Unfollow Amara Bat' })).toHaveLength(2)
    screen.getAllByRole('button', { name: 'Unfollow Amara Bat' }).forEach((button) => expect(button).toHaveAttribute('aria-pressed', 'true'))
  })

  test('creator discovery filters update, expose active state and clear in place', async () => {
    render(<FilterHarness />)
    fireEvent.change(screen.getByLabelText('Niche'), { target: { value: 'Fashion' } })
    expect(screen.getByLabelText('Niche')).toHaveValue('Fashion')
    fireEvent.click(screen.getByLabelText('Verified only'))
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await waitFor(() => expect(screen.getByLabelText('Niche')).toHaveTextContent('All niches'))
    expect(screen.getByLabelText('Verified only')).not.toBeChecked()
  })

  test('workspace file picker returns the selected real File object', () => {
    const onChange = vi.fn()
    render(<FileUpload label="Workspace file" accept="image/*,video/*,.pdf" onChange={onChange} />)
    const file = new File(['brief'], 'brief.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Workspace file'), { target: { files: [file] } })
    expect(onChange).toHaveBeenCalledWith([file])
    expect(screen.getByText('brief.pdf')).toBeInTheDocument()
  })

  test('payment states use distinct attention and completed semantics', () => {
    const { rerender } = render(<StatusBadge status="Payment required" />)
    expect(screen.getByText('Payment required')).toHaveClass('bg-pink-soft')
    rerender(<StatusBadge status="Released" />)
    expect(screen.getByText('Released')).toHaveClass('bg-mint-soft')
  })
})
