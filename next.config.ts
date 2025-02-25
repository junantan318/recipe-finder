/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Optional but good practice
};

module.exports = nextConfig;

module.exports = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY, // ✅ Manually ensuring it loads
    NEXT_PUBLIC_TASTY_API_KEY: process.env.NEXT_PUBLIC_TASTY_API_KEY,
  },
};

