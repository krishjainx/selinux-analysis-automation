/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    webpack: (config) => {
      // Resolve three.js extensions
      config.resolve.extensions.push('.ts', '.tsx', '.js', '.jsx');
      return config;
    },
  }
  
  module.exports = nextConfig