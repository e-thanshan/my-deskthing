import type { ComponentType } from 'react';
import Home from './Home';

// preset buttons 1-3 activate screens in this order; preset 4 is the settings panel
export const screens: { name: string; component: ComponentType }[] = [{ name: 'home', component: Home }];
