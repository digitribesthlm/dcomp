/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,mdx}',
    './components/**/*.{js,jsx,mdx}',
    './app/**/*.{js,jsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hubspotBlue: '#2e475d',
        hubspotTeal: '#00a4bd',
        hubspotOrange: '#ff7a59',
        hubspotGray: '#f5f8fa',
      },
    },
  },
  plugins: [],
}

