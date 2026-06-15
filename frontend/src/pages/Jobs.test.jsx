import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Jobs from './Jobs'
import { getJobMatches, authFetch } from '../services/api'
import { MemoryRouter, useParams } from 'react-router-dom'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getJobMatches: vi.fn(),
    authFetch: vi.fn()
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn()
  }
})

describe('Jobs Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useParams.mockReturnValue({ profileId: '123' })
  })

  it('renders loading state initially', () => {
    authFetch.mockReturnValue(new Promise(() => {})) // hang forever
    render(<MemoryRouter><Jobs /></MemoryRouter>)
    expect(screen.getByText(/Searching real job platforms/i)).toBeInTheDocument()
  })

  it('fetches and displays jobs successfully', async () => {
    authFetch.mockResolvedValue({
      json: async () => ({ raw_skills: { skills: ['Plumbing'] }, generated_summary: 'Plumber', city: 'Delhi', work_domains: [] })
    })
    getJobMatches.mockResolvedValue({
      matches: [
        {
          id: 1, title: 'Expert Plumber', company: 'ABC', location: 'Delhi',
          type: 'Full-time', match_score: 95, apply_url: 'http://apply', source: 'adzuna'
        }
      ]
    })

    render(<MemoryRouter><Jobs /></MemoryRouter>)
    
    await waitFor(() => {
      expect(screen.getByText('Expert Plumber')).toBeInTheDocument()
      expect(screen.getByText('ABC · Delhi')).toBeInTheDocument()
      expect(screen.getByText('95% match')).toBeInTheDocument()
    })
  })

  it('displays empty state if no jobs matched', async () => {
    authFetch.mockResolvedValue({
      json: async () => ({ raw_skills: { skills: ['RareSkill'] }, generated_summary: 'Rare' })
    })
    getJobMatches.mockResolvedValue({ matches: [] })

    render(<MemoryRouter><Jobs /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText(/No matches found/i)).toBeInTheDocument()
    })
  })

  it('shows error state on failure', async () => {
    authFetch.mockResolvedValue({
      json: async () => ({ raw_skills: { skills: ['Plumbing'] }, generated_summary: 'Plumber' })
    })
    getJobMatches.mockRejectedValue(new Error('Failed to connect API'))

    render(<MemoryRouter><Jobs /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText(/Failed to connect API/i)).toBeInTheDocument()
    })
  })

  it('handles search location toggle', async () => {
    authFetch.mockResolvedValue({
      json: async () => ({ raw_skills: { skills: ['Plumbing'] }, generated_summary: 'Plumber', city: 'Mumbai', work_domains: ['Construction'] })
    })
    getJobMatches.mockResolvedValue({
      matches: [{ id: 1, title: 'Expert Plumber', company: 'ABC', location: 'Mumbai', type: 'FT', match_score: 95, source: 'adzuna' }]
    })

    render(<MemoryRouter><Jobs /></MemoryRouter>)

    // Should fetch local jobs first
    await waitFor(() => {
      expect(getJobMatches).toHaveBeenCalledWith(['Plumbing'], 'Plumber', ['Construction'], 'Mumbai')
    })

    // Click 'Anywhere'
    fireEvent.click(screen.getByText('Anywhere in India'))
    
    await waitFor(() => {
      expect(getJobMatches).toHaveBeenCalledWith(['Plumbing'], 'Plumber', ['Construction'], null)
    })
  })

  it('handles pagination', async () => {
    authFetch.mockResolvedValue({
      json: async () => ({ raw_skills: { skills: ['Plumbing'] }, generated_summary: 'Plumber', city: 'Mumbai', work_domains: ['Construction'] })
    })
    const manyJobs = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1, title: `Job ${i + 1}`, company: 'ABC', location: 'Mumbai', type: 'FT', match_score: 90, source: 'adzuna'
    }))
    getJobMatches.mockResolvedValue({ matches: manyJobs })

    render(<MemoryRouter><Jobs /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText('Job 1')).toBeInTheDocument()
      expect(screen.queryByText('Job 15')).not.toBeInTheDocument()
    })

    // Click next page (button with text '2')
    fireEvent.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => {
      expect(screen.getByText('Job 15')).toBeInTheDocument()
      expect(screen.queryByText('Job 1')).not.toBeInTheDocument()
    })
  })
})
