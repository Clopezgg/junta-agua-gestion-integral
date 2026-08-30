import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins:[react()],
  test:{
    include:['**/*.test.ts'],
    exclude:['**/node_modules/**','**/dist/**','**/.{idea,git,cache,output,temp}/**']
  }
});