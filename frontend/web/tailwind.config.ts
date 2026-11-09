import type { Config } from 'tailwindcss';
import { mobileshopPreset } from '@mobileshop/config';

export default {
  presets: [mobileshopPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
} satisfies Config;
