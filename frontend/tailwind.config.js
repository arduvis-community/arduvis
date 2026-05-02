/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // AVC avionics palette
        'avc-bg':      '#0A0E1A',
        'avc-surface': '#111827',
        'avc-border':  '#252D3D',
        'avc-accent':  '#D97706',
        'avc-muted':   '#6B7280',
      },
    },
  },
  plugins: [],
}
