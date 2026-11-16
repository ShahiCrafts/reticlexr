/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The live demo imports the library's plain-ESM source directly from ../src.
  turbopack: {
    root: new URL('..', import.meta.url).pathname,
  },
};

export default nextConfig;
