import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// 每次构建一个唯一编号, 同时写进代码和 /version.json。
// 页面拿自己的编号去和服务器上的 /version.json 比, 不一样就说明网站已经更新、自己是旧页面。
// (2026-10-04: v2.9.2/2.9.3 上线三天, 孩子平板上的页面一直没刷新, 一直在跑旧判题。)
const APP_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
const BUILD_ID = `${APP_VERSION}+${new Date().toISOString()}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'emit-version-json',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json',
          source: JSON.stringify({ version: APP_VERSION, build: BUILD_ID }) })
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
})
