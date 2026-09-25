export interface MaterialDetail {
  id: string;
  name: string;
  heroImage: string;
  heroHeadline: string;
  heroSubheadline: string;
  introTitle: string;
  introDescription: string;
  features: {
    icon: string;
    title: string;
    description: string;
  }[];
  detailsTitle: string;
  detailsChecklist: string[];
  stylesTitle: string;
  stylesDescription: string;
  styleImages: {
    src: string;
    title: string;
    description: string;
  }[];
  ctaTitle: string;
  portfolioHeadline: string;
}

export const materialsDetailed: Record<string, MaterialDetail> = {
  hetre: {
    id: 'hetre',
    name: 'Cuisine en Hêtre',
    heroImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop',
    heroHeadline: 'CUISINES EN BOIS DE HÊTRE',
    heroSubheadline: "L'authenticité chaleureuse sur-Mesure",
    introTitle: 'Le Hêtre : un matériau chaleureux pour une cuisine intemporelle',
    introDescription: 'Le bois de Hêtre, avec sa texture fine et homogène, apporte une ambiance naturelle et lumineuse à votre espace de vie. C\'est le choix par excellence pour ceux qui recherchent chaleur et élégance.',
    features: [
      {
        icon: '🌳',
        title: 'Texture fine',
        description: 'Un grain discret qui s\'intègre parfaitement aux designs contemporains et minimalistes.'
      },
      {
        icon: '💪',
        title: 'Grande solidité',
        description: 'Un bois robuste qui résiste parfaitement aux exigences d\'une cuisine quotidienne.'
      },
      {
        icon: '🎨',
        title: 'Finitions variées',
        description: 'Prend magnifiquement bien les teintes, offrant un large spectre de couleurs chaleureuses.'
      }
    ],
    detailsTitle: 'Cuisines en bois de Hêtre by Madera',
    detailsChecklist: [
      'Façades en Hêtre massif ou plaqué selon votre budget.',
      'Possibilité de teinter le bois pour s\'adapter à vos envies.',
      'Caissons intérieurs de haute qualité.',
      'Accessoires et quincaillerie premium au choix.',
      'Un style chaleureux qui ne se démode jamais.'
    ],
    stylesTitle: 'Cuisine classique ou moderne : un choix sur mesure',
    stylesDescription: 'Quel que soit votre style de prédilection, le Hêtre s\'adapte pour créer une cuisine unique.',
    styleImages: [
      {
        src: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?q=80&w=2070&auto=format&fit=crop',
        title: 'Cuisine classique',
        description: 'Finitions sobres et chaleureuses, bois naturel apparent.'
      },
      {
        src: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop',
        title: 'Cuisine contemporaine',
        description: 'Lignes épurées, mariage avec des éléments foncés ou métalliques.'
      }
    ],
    ctaTitle: 'Faites le choix d\'une cuisine en bois de hêtre sur-mesure',
    portfolioHeadline: 'Nos réalisations en bois de Hêtre'
  },
  chene: {
    id: 'chene',
    name: 'Cuisine en Chêne',
    heroImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=2070&auto=format&fit=crop',
    heroHeadline: 'CUISINES EN BOIS DE CHÊNE',
    heroSubheadline: "La noblesse et la durabilité absolue",
    introTitle: 'Le Chêne : l\'excellence intemporelle pour votre cuisine',
    introDescription: 'Reconnu pour sa robustesse exceptionnelle et son grain distinctif, le chêne est le choix noble par excellence pour une cuisine de caractère, conçue pour traverser les générations.',
    features: [
      {
        icon: '👑',
        title: 'Bois noble',
        description: 'Une esthétique prestigieuse avec un grain profond et marqué qui donne du relief.'
      },
      {
        icon: '🛡️',
        title: 'Longévité extrême',
        description: 'L\'un des bois les plus durs et durables utilisés en ébénisterie.'
      },
      {
        icon: '✨',
        title: 'Vieillit avec grâce',
        description: 'Le chêne acquiert une superbe patine avec le temps, embellissant votre cuisine.'
      }
    ],
    detailsTitle: 'Cuisines en bois de Chêne by Madera',
    detailsChecklist: [
      'Façades en Chêne massif pour une qualité inégalée.',
      'Travail du bois mettant en valeur ses veines et ses nœuds.',
      'Conception sur-mesure pour chaque espace.',
      'Mécanismes durables assortis à la robustesse du bois.',
      'Styles allant du rustique chic au minimalisme texturé.'
    ],
    stylesTitle: 'Rustique ou architectural : le chêne se réinvente',
    stylesDescription: 'Bois de tradition, le chêne excelle aussi dans les agencements très modernes et luxueux.',
    styleImages: [
      {
        src: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=2070&auto=format&fit=crop',
        title: 'Cuisine rustique chic',
        description: 'Chaleur du bois, moulures délicates et charme authentique.'
      },
      {
        src: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?q=80&w=2070&auto=format&fit=crop',
        title: 'Cuisine architecturale',
        description: 'Grandes surfaces lisses en chêne, lignes tendues et design épuré.'
      }
    ],
    ctaTitle: 'Faites le choix d\'une cuisine en bois de chêne sur-mesure',
    portfolioHeadline: 'Nos réalisations en bois de Chêne'
  },
  frene: {
    id: 'frene',
    name: 'Cuisine en Frêne',
    heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
    heroHeadline: 'CUISINES EN BOIS DE FRÊNE',
    heroSubheadline: "Élégance naturelle et veinage distinctif",
    introTitle: 'Le Frêne : la subtilité scandinave pour une cuisine moderne',
    introDescription: 'Le bois de frêne se distingue par ses couleurs claires et ses cernes fortement marqués. Il est l\'allié parfait pour des intérieurs lumineux, souvent associés au design nordique ou minimaliste.',
    features: [
      {
        icon: '〰️',
        title: 'Cernes expressifs',
        description: 'Un motif veiné prononcé qui apporte du caractère et de la fluidité visuelle.'
      },
      {
        icon: '☀️',
        title: 'Tons clairs',
        description: 'Idéal pour agrandir visuellement l\'espace et apporter un maximum de luminosité.'
      },
      {
        icon: '🔨',
        title: 'Excellente élasticité',
        description: 'Bois dur mais très souple à travailler, garantissant des finitions parfaites.'
      }
    ],
    detailsTitle: 'Cuisines en bois de Frêne by Madera',
    detailsChecklist: [
      'Façades en Frêne sélectionnées pour la beauté de leur veinage.',
      'Finitions vernies ou huilées pour protéger le bois tout en gardant son aspect clair.',
      'Possibilité de teintes foncées (frêne thermo-traité) pour un look contrasté.',
      'Agencement intérieur intelligent et optimisé.',
      'Inspiration scandinave ou moderne organique.'
    ],
    stylesTitle: 'Luminosité ou contraste fort',
    stylesDescription: 'Le frêne se prête aussi bien aux ambiances très claires qu\'aux finitions noires qui révèlent son grain.',
    styleImages: [
      {
        src: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2069&auto=format&fit=crop',
        title: 'Inspiration Nordique',
        description: 'Bois clair, espaces ouverts et ambiance apaisante.'
      },
      {
        src: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2070&auto=format&fit=crop',
        title: 'Frêne teint',
        description: 'Teintes foncées laissant transparaître la texture riche du bois.'
      }
    ],
    ctaTitle: 'Faites le choix d\'une cuisine en bois de frêne sur-mesure',
    portfolioHeadline: 'Nos réalisations en bois de Frêne'
  },
  mdf: {
    id: 'mdf',
    name: 'Cuisine en MDF',
    heroImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2070&auto=format&fit=crop',
    heroHeadline: 'CUISINES EN BOIS MDF',
    heroSubheadline: "L'élégance et la robustesse sur-Mesure",
    introTitle: 'Le MDF : un matériau polyvalent pour une cuisine moderne et durable',
    introDescription: 'Le MDF est un panneau de fibres de bois à densité moyenne, très utilisé dans la fabrication de meubles et de cuisines sur-mesure. C\'est une alternative contemporaine au bois massif, offrant design et flexibilité sans compromis sur la durabilité.',
    features: [
      {
        icon: '📝',
        title: 'Surface lisse',
        description: 'Grâce à sa surface homogène, le MDF révèle le meilleur des tendances modernes : minimalisme, lignes épurées et rendus parfaitement nets.'
      },
      {
        icon: '🛡️',
        title: 'Une structure stable',
        description: 'Résiste aux variations quotidiennes et limite la déformation, assurant des portes alignées et des lignes toujours parfaites.'
      },
      {
        icon: '💰',
        title: 'Rapport qualité-prix',
        description: 'Un équilibre parfait entre qualité, style et accessibilité. Idéal pour créer une cuisine moderne sans exploser son budget.'
      }
    ],
    detailsTitle: 'Cuisines en bois MDF by Madera',
    detailsChecklist: [
      'Façades en MDF disponibles en finition laquée, mate ou brillante.',
      'Possibilité d\'impressions et de couleurs variées pour s\'adapter à toutes les ambiances.',
      'Caissons intérieurs robustes et fiables.',
      'Accessoires et quincaillerie au choix du client : poignées, charnières, systèmes d\'ouverture.',
      'Styles modulables : du minimaliste moderne au classique revisité.'
    ],
    stylesTitle: 'Cuisine classique ou moderne : un choix sur mesure',
    stylesDescription: 'Grâce à sa grande polyvalence, le MDF permet de créer des cuisines adaptées à tous les styles.',
    styleImages: [
      {
        src: 'https://images.unsplash.com/photo-1556912998-c57cc6b63ce7?q=80&w=2070&auto=format&fit=crop',
        title: 'Cuisine classique',
        description: 'Finitions mates, tons doux et élégance intemporelle.'
      },
      {
        src: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2069&auto=format&fit=crop',
        title: 'Cuisine moderne',
        description: 'Façades lisses sans poignées et finitions brillantes ou super-mates.'
      }
    ],
    ctaTitle: 'Faites le choix d\'une cuisine en bois MDF sur-mesure',
    portfolioHeadline: 'Nos réalisations en bois MDF'
  },
  egger: {
    id: 'egger',
    name: 'Cuisine en EGGER',
    heroImage: 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?q=80&w=2070&auto=format&fit=crop',
    heroHeadline: 'CUISINES EN PANNEAUX EGGER',
    heroSubheadline: "La haute technologie au service du design",
    introTitle: 'Décors EGGER : textures parfaites et résistance exceptionnelle',
    introDescription: 'Les panneaux mélaminés et stratifiés EGGER sont réputés mondialement pour leur mimétisme bluffant (bois, pierre, métal) et leur robustesse face aux contraintes extrêmes de la cuisine.',
    features: [
      {
        icon: '👁️',
        title: 'Réalisme visuel',
        description: 'Des décors synchronisés où la texture au toucher correspond parfaitement aux veines du bois imprimé.'
      },
      {
        icon: '🛡️',
        title: 'Haute résistance',
        description: 'Surfaces anti-rayures, anti-traces de doigts et très faciles à nettoyer au quotidien.'
      },
      {
        icon: '🌍',
        title: 'Panneaux écologiques',
        description: 'Fabrication européenne responsable respectant les normes environnementales les plus strictes.'
      }
    ],
    detailsTitle: 'Cuisines en panneaux EGGER by Madera',
    detailsChecklist: [
      'Large choix de décors : aspect bois, béton, marbre ou couleurs unies.',
      'Chants ABS assortis parfaitement appliqués grâce à notre technologie laser.',
      'Matériaux très résistants à la chaleur et à l\'humidité.',
      'Solutions PerfectSense brevetées pour un effet ultra-mat ou ultra-brillant.',
      'Un design de très haut niveau, résolument contemporain.'
    ],
    stylesTitle: 'Effet matière et pureté colorée',
    stylesDescription: 'Combinez les différentes textures EGGER pour des contrastes saisissants dans votre cuisine.',
    styleImages: [
      {
        src: 'https://images.unsplash.com/photo-1600585154526-990dced4ea0d?q=80&w=2070&auto=format&fit=crop',
        title: 'Mix matières',
        description: 'Association parfaite entre décor bois texturé et couleurs unies mates.'
      },
      {
        src: 'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?q=80&w=2070&auto=format&fit=crop',
        title: 'Ultra-mat PerfectSense',
        description: 'Rendu velours anti-traces de doigts pour un chic absolu.'
      }
    ],
    ctaTitle: 'Faites le choix d\'une cuisine en EGGER sur-mesure',
    portfolioHeadline: 'Nos réalisations en EGGER'
  },
  'high-gloss': {
    id: 'high-gloss',
    name: 'Cuisine High Gloss',
    heroImage: 'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?q=80&w=2070&auto=format&fit=crop',
    heroHeadline: 'CUISINES HIGH GLOSS',
    heroSubheadline: "La brillance absolue, reflet de votre style",
    introTitle: 'Le High Gloss : des façades ultra-brillantes pour une cuisine lumineuse',
    introDescription: 'Les façades high gloss offrent un rendu miroir spectaculaire qui amplifie la lumière et agrandit visuellement l\'espace. Un choix résolument contemporain pour les cuisines design.',
    features: [
      {
        icon: '✨',
        title: 'Brillance miroir',
        description: 'Une surface parfaitement lisse qui reflète la lumière et sublime votre cuisine.'
      },
      {
        icon: '🧽',
        title: 'Entretien facile',
        description: 'Un simple chiffon doux suffit à retrouver un rendu impeccable au quotidien.'
      },
      {
        icon: '🌈',
        title: 'Coloris éclatants',
        description: 'Une palette intense et profonde, du blanc pur aux teintes les plus audacieuses.'
      }
    ],
    detailsTitle: 'Cuisines high gloss by Madera',
    detailsChecklist: [
      'Façades laquées haute brillance ou films brillants haute qualité.',
      'Chants assortis pour une finition parfaitement nette.',
      'Résistance accrue aux rayures et à la lumière (anti-jaunissement).',
      'Poignées intégrées ou gola pour un look sans interruption.',
      'Un style moderne, lumineux et sophistiqué.'
    ],
    stylesTitle: 'Reflets purs ou couleurs profondes',
    stylesDescription: 'Le high gloss s\'exprime aussi bien dans des ambiances blanches minimalistes que dans des univers colorés affirmés.',
    styleImages: [
      {
        src: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e0?q=80&w=2070&auto=format&fit=crop',
        title: 'Blanc brillant',
        description: 'Minimalisme lumineux, reflets purs et lignes épurées.'
      },
      {
        src: 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?q=80&w=2070&auto=format&fit=crop',
        title: 'Couleurs profondes',
        description: 'Façades laquées intenses pour un caractère affirmé.'
      }
    ],
    ctaTitle: 'Faites le choix d\'une cuisine high gloss sur-mesure',
    portfolioHeadline: 'Nos réalisations high gloss'
  }
};
