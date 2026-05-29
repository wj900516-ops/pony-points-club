/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 关闭 Next 的遥测无需在此配置，运行 `npx next telemetry disable` 即可。
  // 图片域名白名单：仅允许你自己的国内对象存储域名，避免不可控外链。
  images: {
    remotePatterns: [
      // 示例：阿里云 OSS / 腾讯云 COS，部署时改成你自己的桶域名
      { protocol: "https", hostname: "*.oss-cn-hangzhou.aliyuncs.com" },
      { protocol: "https", hostname: "*.cos.ap-guangzhou.myqcloud.com" },
    ],
  },
};

export default nextConfig;
