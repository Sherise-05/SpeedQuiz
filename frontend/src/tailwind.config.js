/** @type {import('tailwindcss').Config} */
export default {
  content: ["{components,pages}/*.{html,js}"],
  theme: {
    extend: {
      animation: {
        moveDown: "moveDown 3s linear infinite",
      },
      keyframes: {
        moveDown: {
          "0%": { transform: "translateY(-30%)" },
          "100%": { transform: "translateY(0%)" },
        },
      },
    },
  },
  plugins: [],
};
