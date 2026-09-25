export const business = {
  name: 'Madera Kitchen',
  siteUrl: 'https://maderakitchen-dz.com',
  logoPath: '/logo1.webp',
  defaultImage: '/hero.webp',
  phoneDisplay: '0562 39 82 83',
  phoneHref: '0562398283',
  phoneE164: '+213562398283',
  whatsappNumber: '213562398283',
  email: 'contact@madera-kitchen.dz',
  address: 'Route national N24, Les pins maritimes, Mohammadia Alger - Algerie',
  addressStreet: 'Route nationale N24, Les Pins Maritimes',
  addressLocality: 'Mohammadia',
  addressRegion: 'Alger',
  addressCountry: 'DZ',
  serviceAreas: ['Alger', 'Mohammadia', 'Blida', 'Tipaza', 'Boumerdes', 'Algerie'],
  socialLinks: [
    'https://www.facebook.com/Maderakitchen16/',
    'https://www.instagram.com/mad.erakitchen',
    'https://www.tiktok.com/@maderalespins',
  ],
};

export const whatsappNumbers = [
  { number: '213562398283', label: '0562 39 82 83' },
  { number: '213664806671', label: '0664 80 66 71' },
  { number: '213773237871', label: '0773 23 78 71' },
];

export const whatsappHrefFor = (num: string, message?: string) => {
  const base = `https://wa.me/${num}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};
