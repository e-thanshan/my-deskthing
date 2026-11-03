import type { ComponentType } from 'react';
import Home from './Home';

// preset buttons 1-2 activate screens in this order; preset 3 is the painting menu, preset 4 the settings panel
export const screens: { name: string; component: ComponentType }[] = [{ name: 'home', component: Home }];
