import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"], theme: { extend: { colors: { ink: "#17251D", leaf: "#287145", cream: "#FAF8F2", clay: "#DE7D47" } } }, plugins: [] };
export default config;
