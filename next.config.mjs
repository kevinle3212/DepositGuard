/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.externals.push("pino-pretty", "lokijs", "encoding");
        // Silence the noisy "Critical dependency: the request of a dependency is
        // an expression" warning emitted by ox (pulled in via @walletconnect).
        // It comes from a dynamic require() inside that third-party package and is
        // harmless; scoped narrowly so real warnings still surface.
        config.ignoreWarnings = [
            ...(config.ignoreWarnings ?? []),
            {
                module: /node_modules[\\/].*ox[\\/]_esm[\\/]tempo/,
                message: /Critical dependency: the request of a dependency is an expression/,
            },
        ];
        return config;
    },
};

export default nextConfig;
