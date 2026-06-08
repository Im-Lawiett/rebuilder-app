/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://appbuilder.rfproject.my.id/api/:path*',
      },
      {
        source: '/adminrfproject',
        destination: 'https://appbuilder.rfproject.my.id/adminrfproject',
      },
      {
        source: '/cdn-cgi/:path*',
        destination: 'https://appbuilder.rfproject.my.id/cdn-cgi/:path*',
      },
    ];
  },
};

export default nextConfig;
