/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: "#11375C",
        offwhite: "#FDF9F6",
        terracotta: "#DD7C54",
        ink: "#16283A",
        muted: "#6B7A85",
        hairline: "#E4DCD3",
      },
      fontFamily: {
        hanken: ["HankenGrotesk-Regular"],
        "hanken-medium": ["HankenGrotesk-SemiBold"],
        "hanken-bold": ["HankenGrotesk-Bold"],
        "hanken-extrabold": ["HankenGrotesk-ExtraBold"],
      },
    },
  },
  plugins: [],
};