import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import App from './App.tsx'

// MemoryRouter lets each test start at a given URL without a real browser address bar.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('routing', () => {
  it('redirects / to the record page', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Record' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Record' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the wordmark and nav links in task order', () => {
    renderAt('/record')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Speek',
      'Record',
      'Dashboard',
      'About',
      'Account',
      'Log in',
    ])
  })

  it('shows the dashboard overview and empty history in terms of Attempts', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Current streak')).toBeInTheDocument()
    expect(screen.getByText('Attempts')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Topic' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'WPM' })).toBeInTheDocument()
    expect(screen.getByText(/No attempts yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Record your first attempt' })).toHaveAttribute(
      'href',
      '/record',
    )
    expect(screen.queryByText(/session|prompt/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows placeholder pages for account and login', () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByText(/Coming soon/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Record an attempt' })).toHaveAttribute(
      'href',
      '/record',
    )
  })

  it('offers a way to start from the about page', () => {
    renderAt('/about')
    expect(screen.getByRole('heading', { name: 'About Speek' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Record your first attempt' })).toHaveAttribute(
      'href',
      '/record',
    )
  })

  it('shows not found for unknown URLs, still inside the layout', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Record' })).toHaveAttribute('href', '/record')
  })
})
