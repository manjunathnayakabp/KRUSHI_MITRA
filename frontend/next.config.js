/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow hot-reloading from your specific network IP
  allowedDevOrigins: ['172.24.224.1', 'localhost'],
}

module.exports = nextConfig