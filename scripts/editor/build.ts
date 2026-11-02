// Bundles the editor page (editor/main.tsx) with rspack, the bundler Remotion itself uses, so the live
// preview runs the exact same compositions as the final render (including brands/ and videos/ auto-discovery).
import { rspack, type Configuration } from "@rspack/core";
import path from "node:path";

export const EDITOR_DIST = path.resolve(".editor-dist");

const config: Configuration = {
  mode: "production",
  context: process.cwd(),
  entry: path.resolve("editor/main.tsx"),
  output: { path: EDITOR_DIST, publicPath: "/editor/", filename: "[name].[contenthash].js", chunkFilename: "[name].[contenthash].js", clean: true },
  resolve: { extensions: [".tsx", ".ts", ".js", ".mjs", ".json"] },
  module: {
    rules: [
      { test: /\.m?js$/, resolve: { fullySpecified: false } },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: "builtin:swc-loader",
        options: { jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } }, target: "es2020" } },
        type: "javascript/auto",
      },
      { test: /\.(png|jpe?g|svg|webp|gif|woff2?|ttf|otf)$/i, type: "asset/resource" },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      title: "Video editor",
      templateContent: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Video editor</title></head><body><div id="root"></div></body></html>`,
    }),
  ],
  performance: { hints: false },
  devtool: false,
  stats: "errors-warnings",
};

export const buildEditor = () =>
  new Promise<void>((resolve, reject) => {
    rspack(config, (err, stats) => {
      if (err) return reject(err);
      if (stats?.hasErrors()) return reject(new Error(stats.toString({ all: false, errors: true })));
      resolve();
    });
  });

if (import.meta.main) {
  await buildEditor();
  console.log(`Built the editor into ${EDITOR_DIST}`);
}
