import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VoiceRecorder from './VoiceRecorder'
import { extractSkills, transcribeAudio, saveProfile } from '../services/api'
import { MemoryRouter } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

vi.mock('../services/api', () => ({
  extractSkills: vi.fn(),
  transcribeAudio: vi.fn(),
  saveProfile: vi.fn()
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

// Mock MediaRecorder
class MockMediaRecorder {
  constructor() {
    this.state = 'inactive'
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['audio data'], { type: 'audio/webm' }) })
    }
    if (this.onstop) this.onstop()
  }
}
global.MediaRecorder = MockMediaRecorder
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] })
}

describe('VoiceRecorder', () => {
  const mockOnSkillsExtracted = vi.fn()

  const mockUser = { user_metadata: { full_name: 'Test User' } }

  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: mockUser })
  })

  it('renders initial state', () => {
    render(<MemoryRouter><VoiceRecorder /></MemoryRouter>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('handles recording flow and API calls successfully', async () => {
    transcribeAudio.mockResolvedValue({ transcript: 'Hello, I am a plumber.' })
    extractSkills.mockResolvedValue({
      skills: ['Plumbing'],
      summary: 'Experienced plumber',
      work_domains: ['Construction'],
      years_experience: { total: 5, breakdown: {} },
      tools_used: []
    })

    render(<MemoryRouter><VoiceRecorder /></MemoryRouter>)
    
    // Start recording
    const recordBtn = screen.getByRole('button')
    fireEvent.click(recordBtn)
    
    // Wait for it to start recording
    await waitFor(() => expect(screen.getByText('⏹')).toBeInTheDocument())
    
    // Stop recording
    fireEvent.click(screen.getByRole('button'))

    // Should call API and render extracted profile
    await waitFor(() => {
      expect(transcribeAudio).toHaveBeenCalled()
      expect(extractSkills).toHaveBeenCalledWith('Hello, I am a plumber.')
      expect(screen.getByText('Experienced plumber')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    transcribeAudio.mockRejectedValue(new Error('Network Error'))
    
    render(<MemoryRouter><VoiceRecorder /></MemoryRouter>)
    
    // Start & Stop
    const recordBtn = screen.getByRole('button')
    fireEvent.click(recordBtn)
    
    await waitFor(() => expect(screen.getByText('⏹')).toBeInTheDocument())
    
    fireEvent.click(screen.getByRole('button'))

    // Expect error
    await waitFor(() => {
      expect(screen.getByText(/Network Error/i)).toBeInTheDocument()
    })
  })

  it('handles saving profile successfully', async () => {
    transcribeAudio.mockResolvedValue({ transcript: 'Hello, I am a plumber.' })
    extractSkills.mockResolvedValue({
      skills: ['Plumbing'],
      summary: 'Experienced plumber',
      work_domains: ['Construction'],
      years_experience: { total: 5, breakdown: {} },
      tools_used: ['Wrench'],
      languages_spoken: ['English']
    })
    saveProfile.mockResolvedValue({ profile_id: 'new-123' })

    render(<MemoryRouter><VoiceRecorder /></MemoryRouter>)
    
    // Start & Stop
    const recordBtn = screen.getByRole('button')
    fireEvent.click(recordBtn)
    await waitFor(() => expect(screen.getByText('⏹')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button'))

    // Wait for done state
    await waitFor(() => expect(screen.getByText('Basic Details')).toBeInTheDocument())

    // Fill the form
    fireEvent.change(screen.getByPlaceholderText('10-digit mobile number'), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. Mumbai'), { target: { value: 'Delhi' } })

    // Save
    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }))

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test User',
        phone: '9876543210',
        city: 'Delhi'
      }))
      expect(screen.getByText(/Profile Saved Successfully/i)).toBeInTheDocument()
    })

    // Click Record Another Profile to test reset
    fireEvent.click(screen.getByText(/\+ Record Another Profile/i))
    expect(screen.queryByText(/Profile Saved Successfully/i)).not.toBeInTheDocument()
  })
})
