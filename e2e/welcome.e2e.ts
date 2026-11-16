import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('welcome page keeps the DONMEN brand and opens client signup', async ({ page }) => {
  await page.goto('/bienvenue')
  await expect(page.getByRole('heading', { name: 'Bienvenue sur DONMEN' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'DONMEN' })).toBeVisible()

  await mkdir('docs/screens/phase-0', { recursive: true })
  await page.screenshot({ path: 'docs/screens/phase-0/bienvenue.png' })

  await page.getByRole('link', { name: 'Je suis client' }).click()
  await expect(page).toHaveURL(/\/inscription\/client$/)
  await expect(page.getByRole('textbox', { name: "Nom d'utilisateur" })).toBeVisible()
})
