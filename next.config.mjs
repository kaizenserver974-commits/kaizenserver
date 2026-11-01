/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Le projet est autonome : on évite que Next remonte au dossier parent.
  outputFileTracingRoot: import.meta.dirname,
};
export default nextConfig;
