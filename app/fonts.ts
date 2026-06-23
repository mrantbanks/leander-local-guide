import { Fraunces, Hanken_Grotesk, Caveat, Bebas_Neue } from 'next/font/google';

// The four-voice type system from the design committee:
// Fraunces = the magazine, Hanken = the utility, Caveat = Anthony's hand, Bebas = the stamp.
export const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
export const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap' });
export const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' });
export const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas', display: 'swap' });
