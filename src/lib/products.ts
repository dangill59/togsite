export interface Product {
  slug: string;
  name: string;
  priceCents: number;
  description: string;
  image: string;
  fulfillment: 'printful' | 'self';
  sizes?: string[];
  printfulVariantId?: number;
  isCustomHero?: boolean;
}

export const products: Product[] = [
  // === Print-on-demand (Printful) ===
  { slug: 'tog-tee', name: 'TOG Tee', priceCents: 2500, description: 'Black tee with the growing THOSE ONE GUYS! and comic bursts.', image: '/merch-black-t-shirt.png', fulfillment: 'printful', sizes: ['S', 'M', 'L', 'XL', '2XL'] },
  { slug: 'tog-mug', name: 'TOG Mug', priceCents: 1500, description: 'Start your morning loud. Coffee tastes better with comic book energy.', image: '/merch-coffee-mug.png', fulfillment: 'printful' },
  { slug: 'tog-cap', name: 'TOG Cap', priceCents: 2000, description: 'Trucker cap with the retro starburst logo. Dad approved.', image: '/merch-baseball-cap.png', fulfillment: 'printful' },
  { slug: 'bandana', name: 'Bandana', priceCents: 1200, description: 'Comic burst bandana. Wear it, wave it, hang it on the wall.', image: '/merch-bandana.png', fulfillment: 'printful' },
  { slug: 'squad-bandana', name: 'Squad Bandana', priceCents: 1200, description: 'TOG Squad bandana. Rep the squad at every show.', image: '/merch-squad-bandana.png', fulfillment: 'printful' },

  // === Self-fulfilled ===
  { slug: 'enamel-pin', name: 'Enamel Pin', priceCents: 1000, description: 'Slap it on your jacket, your bag, your soul. Collectible enamel pin.', image: '/merch-enamel-pin.png', fulfillment: 'self' },
  { slug: 'squad-pin', name: 'Squad Pin', priceCents: 1000, description: 'TOG Squad enamel pin. Prove you\'re in the squad.', image: '/merch-squad-pin.png', fulfillment: 'self' },
  { slug: 'wristband', name: 'Wristband', priceCents: 800, description: 'Rock hard. Sweat harder. Wristband for the committed fan.', image: '/merch-sweatband-wristband.png', fulfillment: 'self' },
  { slug: 'headband', name: 'Headband', priceCents: 1000, description: 'TOG headband. Keep the sweat out and the groove in.', image: '/merch-headband.png', fulfillment: 'self' },
  { slug: 'squad-headband', name: 'Squad Headband', priceCents: 1200, description: 'TOG Squad headband. Retro 70s vibes with the brown and orange stripes.', image: '/merch-squad-headband.png', fulfillment: 'self' },
];

// === Custom hero products (require squad membership + mockup) ===
export const customHeroProducts: Product[] = [
  { slug: 'custom-hero-tee', name: 'Custom Hero Tee', priceCents: 3000, description: 'Your superhero on a tee.', image: '/merch-black-t-shirt.png', fulfillment: 'printful', sizes: ['S', 'M', 'L', 'XL', '2XL'], isCustomHero: true },
  { slug: 'custom-hero-mug', name: 'Custom Hero Mug', priceCents: 1800, description: 'Your superhero on a mug.', image: '/merch-coffee-mug.png', fulfillment: 'printful', isCustomHero: true },
  { slug: 'custom-hero-cap', name: 'Custom Hero Cap', priceCents: 2500, description: 'Your superhero on a cap.', image: '/merch-baseball-cap.png', fulfillment: 'printful', isCustomHero: true },
  { slug: 'custom-hero-pin', name: 'Custom Hero Pin', priceCents: 1200, description: 'Your superhero on an enamel pin.', image: '/merch-enamel-pin.png', fulfillment: 'self', isCustomHero: true },
];

export function getProduct(slug: string): Product | undefined {
  return products.find(p => p.slug === slug) || customHeroProducts.find(p => p.slug === slug);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
