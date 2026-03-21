import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 這裡的 base 必須填入您 GitHub 專案的精確名稱，前後都要有斜線
export default defineConfig({
  plugins: [react()],
  base: '/jept-game/', 
})
