// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getMyHairdresserPublicProfile: vi.fn(),
  saveHairdresserPublicProfile: vi.fn(),
}))

vi.mock('../hairdressers/api', () => ({
  getMyHairdresserPublicProfile: apiMocks.getMyHairdresserPublicProfile,
  saveHairdresserPublicProfile: apiMocks.saveHairdresserPublicProfile,
}))

import ProWorkspace from './ProWorkspace'

beforeEach(() => {
  window.localStorage.clear()
  apiMocks.getMyHairdresserPublicProfile.mockResolvedValue(null)
  apiMocks.saveHairdresserPublicProfile.mockImplementation(async (
    _userId,
    _firstName,
    profile,
    services,
  ) => ({ profile, services }))
})

afterEach(cleanup)

describe('ProWorkspace', () => {
  it('accepts a booking, completes it after cash confirmation, and saves the care note', async () => {
    const user = userEvent.setup()
    render(<ProWorkspace firstName="Aline" userId="user-a" />)

    await user.click(screen.getByRole('button', { name: /Voir la demande/ }))
    await user.click(screen.getByRole('button', { name: /Accepter la demande/ }))
    await user.click(screen.getByRole('button', { name: /Je suis en route/ }))
    await user.click(screen.getByRole('button', { name: /Terminer la prestation/ }))

    await user.click(screen.getByLabelText(/J’ai reçu/))
    await user.type(screen.getByPlaceholderText(/Produits utilisés/), 'Huile de jojoba conseillée.')
    await user.click(screen.getByRole('button', { name: /Terminé et encaissé/ }))

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem('donmen-pro-workspace-v1:user-a') ?? '{}')
      const marie = saved.requests.find((request: { id: string }) => request.id === 'demande-marie')
      expect(marie.status).toBe('done')
      expect(marie.careNote).toBe('Huile de jojoba conseillée.')
    })
  })

  it('requires a refusal reason and moves the request to past requests', async () => {
    const user = userEvent.setup()
    render(<ProWorkspace firstName="Aline" userId="user-a" />)

    await user.click(screen.getByRole('button', { name: /Demandes/ }))
    const requestCard = screen.getByText('Marie A.').closest('article')
    if (!requestCard) throw new Error('La demande de Marie devrait être affichée.')
    await user.click(within(requestCard).getByRole('button', { name: 'Refuser' }))

    const dialog = screen.getByRole('dialog')
    expect((within(dialog).getByRole('button', { name: 'Confirmer le refus' }) as HTMLButtonElement).disabled).toBe(true)
    await user.click(within(dialog).getByRole('button', { name: 'Trop loin' }))
    await user.click(within(dialog).getByRole('button', { name: 'Confirmer le refus' }))
    await user.click(screen.getByRole('tab', { name: 'Passées' }))

    expect(document.body.contains(screen.getByText('Refusé'))).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('donmen-pro-workspace-v1:user-a') ?? '{}').requests.find((request: { id: string }) => request.id === 'demande-marie').refusalReason).toBe('Trop loin')
  })

  it('toggles availability directly from the dashboard', async () => {
    render(<ProWorkspace firstName="Aline" userId="user-a" />)

    const availability = screen.getByRole('button', { name: /Vous êtes indisponible/ })
    expect(availability?.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(availability)

    expect(screen.getByRole('button', { name: /Vous êtes disponible/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('saves weekly opening hours independently by day', async () => {
    const user = userEvent.setup()
    render(<ProWorkspace firstName="Aline" userId="user-a" />)

    await user.click(screen.getByRole('button', { name: 'Profil' }))
    await user.click(screen.getByRole('button', { name: /Mes horaires/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Mercredi' }))
    fireEvent.change(screen.getByLabelText('Mercredi heure de début'), { target: { value: '09:30' } })

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem('donmen-pro-workspace-v1:user-a') ?? '{}')
      expect(saved.hours[2]).toEqual({ open: true, start: '09:30', end: '18:00' })
      expect(saved.hours[1].open).toBe(false)
    })
  })

  it('keeps locally persisted workspace data separate for each signed-in user', async () => {
    const user = userEvent.setup()
    const firstUser = render(<ProWorkspace firstName="Aline" userId="user-a" />)
    await user.click(screen.getByRole('button', { name: /Vous êtes indisponible/ }))

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem('donmen-pro-workspace-v1:user-a') ?? '{}')
      expect(saved.available).toBe(true)
    })
    firstUser.unmount()

    render(<ProWorkspace firstName="Aline" userId="user-b" />)
    expect(screen.getByRole('button', { name: /Vous êtes indisponible/ }).getAttribute('aria-pressed')).toBe('false')
  })

  it('publishes the updated public profile and catalog for automatic client listing', async () => {
    const user = userEvent.setup()
    render(<ProWorkspace firstName="Aline" userId="user-a" />)

    await user.click(screen.getByRole('button', { name: 'Profil' }))
    await user.click(screen.getByRole('button', { name: /Mon profil public/ }))
    await user.type(screen.getByLabelText('Présentation'), 'Coiffeuse professionnelle.')
    await user.type(screen.getByLabelText(/Spécialités/), 'Tresses')
    await user.type(screen.getByLabelText('Quartiers couverts à Douala'), 'Akwa')
    await user.click(screen.getByRole('button', { name: 'Enregistrer mon profil' }))

    await waitFor(() => {
      expect(apiMocks.saveHairdresserPublicProfile).toHaveBeenLastCalledWith(
        'user-a',
        'Aline',
        expect.objectContaining({
          presentation: 'Coiffeuse professionnelle.',
          specialties: 'Tresses',
          neighborhoods: 'Akwa',
        }),
        [],
        false,
        expect.any(Array),
      )
    })
  })
})
