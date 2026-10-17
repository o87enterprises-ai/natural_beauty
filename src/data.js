// Placeholder catalogue — swap names, copy, prices and molecules for real data later.
export const categories = [
  { id: 'face', name: 'Face', blurb: 'Daily rituals for calm, luminous skin.' },
  { id: 'body', name: 'Body', blurb: 'Whipped, grounding care from head to toe.' },
  { id: 'hair', name: 'Hair', blurb: 'Roots-up nourishment, nothing weighed down.' },
];

const BASE_DIRECTIONS = 'Warm a small amount between fingertips and press gently into skin.';

export const products = [
  {
    id: 'face-daily', category: 'face', name: 'Daily Face Cream', line: 'Light whipped moisture',
    price: 34, size: '50 g',
    blurb: 'A weightless everyday cream that melts in and leaves skin soft, never slick.',
    ingredients: ['Aloe leaf juice', 'Shea butter', 'Jojoba seed oil', 'Glycerin', 'Vitamin E', 'Rosehip oil'],
    molecules: [
      { name: 'Glycerin', note: 'Draws moisture in', kind: 'chain' },
      { name: 'Squalane', note: 'Softens & seals', kind: 'chain' },
      { name: 'Tocopherol', note: 'Vitamin E, antioxidant', kind: 'ringchain' },
    ],
    directions: BASE_DIRECTIONS,
  },
  {
    id: 'face-night', category: 'face', name: 'Night Repair Balm', line: 'Overnight softening balm',
    price: 42, size: '50 g',
    blurb: 'A rich, melt-away balm for the quiet hours, so you wake up looking rested.',
    ingredients: ['Shea butter', 'Calendula extract', 'Bakuchiol', 'Squalane', 'Beeswax', 'Lavender oil'],
    molecules: [
      { name: 'Bakuchiol', note: 'Plant-based retinol alternative', kind: 'ringchain' },
      { name: 'Squalane', note: 'Softens & seals', kind: 'chain' },
      { name: 'Ceramide', note: 'Supports the skin barrier', kind: 'ring' },
    ],
    directions: BASE_DIRECTIONS,
  },
  {
    id: 'face-eye', category: 'face', name: 'Eye Revive Cream', line: 'Cooling eye cream',
    price: 38, size: '30 g',
    blurb: 'A cooling, featherlight cream for the delicate skin around the eyes.',
    ingredients: ['Cucumber extract', 'Hyaluronic acid', 'Caffeine', 'Aloe leaf juice', 'Green tea', 'Vitamin E'],
    molecules: [
      { name: 'Caffeine', note: 'Wakes tired-looking skin', kind: 'ring' },
      { name: 'Hyaluronic Acid', note: 'Holds water', kind: 'chain' },
      { name: 'Catechin', note: 'Green tea antioxidant', kind: 'ringchain' },
    ],
    directions: 'Dab lightly around the orbital bone with your ring finger.',
  },
  {
    id: 'body-butter', category: 'body', name: 'Whipped Body Butter', line: 'Cocoa & shea softness',
    price: 28, size: '120 g',
    blurb: 'A cloud of cocoa and shea that sinks in and leaves a soft, satin finish.',
    ingredients: ['Cocoa butter', 'Shea butter', 'Sweet almond oil', 'Vitamin E', 'Vanilla extract'],
    molecules: [
      { name: 'Stearic Acid', note: 'Cocoa butter fatty acid', kind: 'chain' },
      { name: 'Oleic Acid', note: 'Deeply conditioning', kind: 'chain' },
      { name: 'Tocopherol', note: 'Vitamin E, antioxidant', kind: 'ringchain' },
    ],
    directions: 'Massage over damp skin after bathing.',
  },
  {
    id: 'body-hand', category: 'body', name: 'Garden Hand Cream', line: 'Fast-absorbing care',
    price: 18, size: '60 g',
    blurb: 'A pocket-sized cream that rescues dry hands without leaving a greasy trace.',
    ingredients: ['Shea butter', 'Calendula extract', 'Glycerin', 'Chamomile', 'Sunflower oil'],
    molecules: [
      { name: 'Glycerin', note: 'Draws moisture in', kind: 'chain' },
      { name: 'Allantoin', note: 'Soothes & smooths', kind: 'ring' },
      { name: 'Bisabolol', note: 'Chamomile calm', kind: 'ringchain' },
    ],
    directions: 'Smooth over hands and cuticles whenever needed.',
  },
  {
    id: 'body-scrub', category: 'body', name: 'Sugar Glow Scrub', line: 'Gentle polishing scrub',
    price: 24, size: '150 g',
    blurb: 'Fine cane sugar and nourishing oils buff away dullness for a visible glow.',
    ingredients: ['Cane sugar', 'Coconut oil', 'Sweet almond oil', 'Orange peel', 'Vitamin E'],
    molecules: [
      { name: 'Sucrose', note: 'Natural exfoliant', kind: 'ring' },
      { name: 'Lauric Acid', note: 'Coconut-derived', kind: 'chain' },
      { name: 'Limonene', note: 'Citrus aroma', kind: 'ringchain' },
    ],
    directions: 'Massage onto wet skin in circles, then rinse.',
  },
  {
    id: 'hair-mask', category: 'hair', name: 'Root Strength Mask', line: 'Deep conditioning mask',
    price: 32, size: '200 g',
    blurb: 'A creamy weekly mask that leaves strands supple, strong and shiny.',
    ingredients: ['Argan oil', 'Shea butter', 'Hydrolysed oat protein', 'Panthenol', 'Rosemary extract'],
    molecules: [
      { name: 'Panthenol', note: 'Provitamin B5', kind: 'chain' },
      { name: 'Oleic Acid', note: 'Deeply conditioning', kind: 'chain' },
      { name: 'Rosmarinic Acid', note: 'Rosemary antioxidant', kind: 'ringchain' },
    ],
    directions: 'Apply to damp lengths, leave 10 minutes, rinse well.',
  },
  {
    id: 'hair-oil', category: 'hair', name: 'Scalp Calm Oil', line: 'Soothing scalp oil',
    price: 26, size: '50 ml',
    blurb: 'A light blend of botanical oils to settle and nourish the scalp.',
    ingredients: ['Jojoba seed oil', 'Castor oil', 'Peppermint oil', 'Tea tree oil', 'Vitamin E'],
    molecules: [
      { name: 'Menthol', note: 'Cooling sensation', kind: 'ring' },
      { name: 'Ricinoleic Acid', note: 'Castor oil nourishment', kind: 'chain' },
      { name: 'Terpinen-4-ol', note: 'Tea tree purifier', kind: 'ringchain' },
    ],
    directions: 'Part hair, massage into scalp, leave in or rinse after 20 minutes.',
  },
  {
    id: 'hair-leave', category: 'hair', name: 'Leave-in Cream', line: 'Frizz-taming cream',
    price: 29, size: '100 g',
    blurb: 'A weightless leave-in that smooths frizz and defines natural texture.',
    ingredients: ['Aloe leaf juice', 'Mango butter', 'Flaxseed gel', 'Glycerin', 'Coconut oil'],
    molecules: [
      { name: 'Mangiferin', note: 'Mango antioxidant', kind: 'ringchain' },
      { name: 'Glycerin', note: 'Draws moisture in', kind: 'chain' },
      { name: 'Lauric Acid', note: 'Coconut-derived', kind: 'chain' },
    ],
    directions: 'Work through damp hair and style as usual.',
  },
];

export const byCategory = (id) => products.filter((p) => p.category === id);
export const productById = (id) => products.find((p) => p.id === id);
