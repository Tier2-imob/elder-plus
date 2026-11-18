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
        // Darker terracotta for text on light backgrounds and as a fill under white text (>= 4.5:1).
        terracottaDark: "#B14D23",
        ink: "#16283A",
        muted: "#606E78",
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