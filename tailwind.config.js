/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          brand: {
            blue: '#00006a',
            red: '#fa0101',
            dark: '#000000',
            light: '#ffffff'
          }
        }
      },
    },
    plugins: [],
  }