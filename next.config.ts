/** @type {import('next').NextConfig} */
const nextConfig = {
  // tes autres configs éventuelles
  // ...,

  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.1.38', '192.168.0.0/16'],
}

module.exports = nextConfig