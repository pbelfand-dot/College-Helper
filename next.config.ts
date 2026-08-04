import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /** Traces only the modules the server imports, so the desktop build can ship a server. */
  output: 'standalone',

  images: {
    /*
     * ApplyPilot renders no `next/image` anywhere — every graphic is an inline
     * SVG icon. Left on, the optimizer pulls `sharp` and its libvips binaries
     * into the traced output: 33 MB, for a route nothing links to. In the
     * Windows package they were *Linux* binaries, which could never have run
     * there at all.
     *
     * They are also what `npm audit` flags against this tree, so not shipping
     * them removes a real finding rather than suppressing it.
     */
    unoptimized: true,
  },
};

export default nextConfig;
