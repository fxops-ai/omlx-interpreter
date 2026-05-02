module.exports = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8002/:path*',
      },
    ];
  },
};
