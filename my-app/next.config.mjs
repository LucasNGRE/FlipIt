/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false,
	env: {
	  DATABASE_URL: process.env.DATABASE_URL, // Ajoute ici ta variable DATABASE_URL
	},
	experimental: {
	  appDir: true, // Si vous utilisez le dossier 'app' pour les API
	},
  };
  
  export default nextConfig;
  