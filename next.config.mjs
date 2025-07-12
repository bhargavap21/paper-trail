/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Handle canvas dependency
    config.resolve.alias.canvas = false;
    
    // Exclude certain modules from server build
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    
    // Fallbacks for Node modules
    config.resolve.fallback = { 
      ...config.resolve.fallback, 
      fs: false,
      path: false,
      process: false,
      util: false,
      zlib: false,
      stream: false,
    };
    
    return config;
  },
}

export default nextConfig