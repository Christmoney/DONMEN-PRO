import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      includeAssets: [
        'brand/donmen-couronne-transparent.png',
        'brand/donmen-icon-32.png',
        'brand/donmen-icon-180.png',
        'brand/donmen-icon-192.png',
        'brand/donmen-icon-512.png',
      ],
      manifest: {
        name: 'DONMEN — Le roi du look',
        short_name: 'DONMEN',
        theme_color: '#00257C',
        background_color: '#00257C',
        display: 'standalone',
        lang: 'fr',
        icons: [
          {
            src: 'brand/donmen-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'brand/donmen-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{css,html,js,woff2,webp}'],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
})
