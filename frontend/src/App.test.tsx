import { render, screen } from '@testing-library/react'
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

  it('shows every nav link', () => {
    renderAt('/record')
    for (const name of ['About', 'Dashboard', 'Record', 'Account', 'Log in']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('shows the dashboard overview and empty history', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Current streak')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'WPM' })).toBeInTheDocument()
    expect(screen.getByText(/No sessions yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows placeholder pages for account and login', () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByText('Coming soon.')).toBeInTheDocument()
  })

  it('shows not found for unknown URLs, still inside the layout', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })
})
