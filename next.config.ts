import type { NextConfig } from "next";

// Oyun yalnızca ahmetenesayyildiz.com üzerinden yayınlanır;
// eski vercel.app adresleri oraya yönlendirilir (yer imleri kopmasın).
const OLD_HOSTS = [
  "komikoyun.vercel.app",
  "komikoyun-drsemihemre.vercel.app",
  "komikoyun-git-main-drsemihemre.vercel.app",
];

const nextConfig: NextConfig = {
  async redirects() {
    return OLD_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://ahmetenesayyildiz.com/:path*",
      permanent: false,
    }));
  },
};

export default nextConfig;
