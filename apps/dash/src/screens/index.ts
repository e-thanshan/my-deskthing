import type { ComponentType } from 'react';
import Home from './Home';

// preset buttons 1-4 activate screens in this order
export const screens: { name: string; component: ComponentType }[] = [{ name: 'home', component: Home }];
