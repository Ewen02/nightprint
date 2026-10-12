// Remotion's webpack config turns font imports into URLs.
declare module "*.woff2" {
  const url: string;
  export default url;
}
