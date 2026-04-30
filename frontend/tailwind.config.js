/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // AVC aerospace dark palette
        canvas:  '#111827',
        surface: '#1f2937',
        border:  '#374151',
        accent:  '#2563eb',
        'accent-dim': '#1d4ed8',
        muted:   '#6b7280',
      },
    },
  },
  plugins: [],
}
