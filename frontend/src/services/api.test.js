import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authFetch, getJobMatches, saveProfile, extractSkills, transcribeAudio } from './api'
import { supabase } from './supabase'

// Mock the environment variable
vi.stubEnv('VITE_API_URL', 'http://localhost:8000')

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    }
  }
}))

// Mock global fetch
globalThis.fetch = vi.fn()

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authFetch', () => {
    it('attaches bearer token if session exists', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'fake-token' } }
      })
      globalThis.fetch.mockResolvedValue({ ok: true })

      await authFetch('http://localhost:8000/test')

      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:8000/test', expect.objectContaining({
        headers: { 'Authorization': 'Bearer fake-token' }
      }))
    })

    it('throws error with detail from JSON on 401', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Not authenticated' })
      })

      await expect(authFetch('http://localhost:8000/test')).rejects.toThrow('Not authenticated')
    })

    it('throws generic error on non-json 502', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => { throw new Error('Not json') }
      })

      await expect(authFetch('http://localhost:8000/test')).rejects.toThrow('HTTP error! status: 502')
    })

    it('propagates network failure', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
      globalThis.fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(authFetch('http://localhost:8000/test')).rejects.toThrow('Failed to fetch')
    })
  })

  describe('Contract tests', () => {
    beforeEach(() => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    })

    it('getJobMatches returns matches array', async () => {
      // Mock exactly the Pydantic MatchJobsResponse
      const mockResponse = {
        matches: [
          {
            id: 1, title: 'Plumber', company: 'ABC', location: 'Delhi',
            type: 'Full-time', description: '', apply_url: '', source: '',
            match_score: 95.0, skills: ['Plumbing']
          }
        ]
      }
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const data = await getJobMatches(['Plumbing'], 'Summary')
      expect(data).toHaveProperty('matches')
      expect(Array.isArray(data.matches)).toBe(true)
    })

    it('saveProfile returns profile_id', async () => {
      // Mock exactly the Pydantic SaveProfileResponse
      const mockResponse = { success: true, profile_id: 'uuid', share_slug: 'slug123' }
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => mockResponse })

      const data = await saveProfile({})
      expect(data).toHaveProperty('profile_id', 'uuid')
      expect(data).toHaveProperty('success', true)
    })

    it('extractSkills returns skills array', async () => {
      // Mock exactly the Pydantic ExtractionResponse
      const mockResponse = {
        name: null, skills: ['A'], years_experience: {total: 0, breakdown: {}},
        tools_used: [], work_domains: [], languages_spoken: [], summary: 'sum',
        needs_more_info: false, followup_question: null
      }
      globalThis.fetch.mockResolvedValue({ ok: true, json: async () => mockResponse })

      const data = await extractSkills('Hello')
      expect(data).toHaveProperty('skills')
      expect(Array.isArray(data.skills)).toBe(true)
    })
    
    it('transcribeAudio returns transcript', async () => {
        const mockResponse = { transcript: "Hello", language: "en" }
        globalThis.fetch.mockResolvedValue({ ok: true, json: async () => mockResponse })
        const blob = new Blob([""], { type: "audio/webm" })
        const data = await transcribeAudio(blob)
        expect(data).toHaveProperty('transcript', 'Hello')
    })
  })
})
