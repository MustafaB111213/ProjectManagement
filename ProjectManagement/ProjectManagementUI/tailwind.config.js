/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // DÜZELTME: Renkler artık doğrudan burada tanımlanıyor.
      colors: {
        // Ana Marka Renkleri
        'brand-blue': '#0073ea',
        'brand-blue-hover': '#0060b9',
        'brand-blue-surface': '#f0f7ff',
        
        // Monday.com'dan ilham alan ek renkler
        'main-purple': '#7857FF', // Bu eksikti, şimdi eklendi.
        'dark-purple': '#5842BC', // Bu eksikti, şimdi eklendi.

        // Arayüz Renkleri
        'sidebar-bg': '#292f4c',
        'main-bg': '#f6f7fb',
        'card-bg': '#ffffff',
        'border-color': '#d0d4e4',
        'border-color-soft': '#e6e9ef',

        // Metin Renkleri
        'text-primary': '#323338',
        'text-secondary': '#676879',
        'text-on-brand': '#ffffff',

        // Durum Renkleri
        'status-success': '#037f4c',
        'status-warning': '#fdab3d',
        'status-danger': '#df2f4a',
        'status-done': '#00c875',
      },
      fontSize: {
        // Monday.com'un h1 başlığı için özel bir boyut oluşturuyoruz.
        'h1': ['32px', '40px'], // [fontSize, lineHeight]
      },
      letterSpacing: {
        // Monday.com'un başlık harf aralığı için özel bir değer oluşturuyoruz.
        'h1': '-0.5px',
      },

      fontFamily: {
        sans: ['Figtree', 'Roboto', 'sans-serif'],
        title: ['Poppins', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'xs': '0px 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'sm': '0px 4px 8px rgba(0, 0, 0, 0.2)',
        'md': '0px 6px 20px rgba(0, 0, 0, 0.2)',
        'lg': '0px 15px 50px rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
      }
    },
  },
  plugins: [],
}