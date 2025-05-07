/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This is needed to ensure Socket.IO works correctly with Next.js
  webpack: (config) => {
    config.externals.push({
      bufferutil: "bufferutil",
      "utf-8-validate": "utf-8-validate",
    });
    return config;
  }
};

module.exports = nextConfig; 