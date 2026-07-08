module.exports = {
  pageExtensions: ["js", "jsx", "ts", "tsx"],

  webpack5: true,

  images: {
    domains: ["openweathermap.org"],
  },

  webpack: (config, { dev, isServer, webpack }) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    })

    return config
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
}
