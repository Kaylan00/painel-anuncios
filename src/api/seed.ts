import type { Category, Listing, ListingStatus } from '../features/listings/model/types';

/** Gerador pequeno e determinístico: a mesma semente sempre gera os mesmos anúncios. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CategorySeed {
  category: Category;
  weight: number;
  minPrice: number;
  maxPrice: number;
  items: string[];
  details: string[];
}

const CATALOG: CategorySeed[] = [
  {
    category: 'Eletrônicos',
    weight: 22,
    minPrice: 120,
    maxPrice: 9000,
    items: ['Notebook 15 polegadas', 'Celular 128 GB', 'Monitor 27 polegadas', 'Fone sem fio', 'Console de videogame', 'Tablet 10 polegadas', 'Caixa de som portátil', 'Câmera mirrorless', 'Smart TV 50 polegadas', 'Relógio inteligente'],
    details: ['com nota fiscal', 'pouco uso', 'na caixa', 'com garantia', 'revisado', 'bateria nova', 'sem marcas de uso'],
  },
  {
    category: 'Veículos',
    weight: 12,
    minPrice: 6500,
    maxPrice: 145000,
    items: ['Hatch 1.0 2019', 'Sedã automático 2021', 'Moto 160 cc 2022', 'Picape cabine dupla 2018', 'SUV compacto 2020', 'Scooter 125 cc 2023', 'Utilitário 2017', 'Hatch 1.6 2016'],
    details: ['único dono', 'revisões em dia', 'IPVA pago', 'pneus novos', 'baixa quilometragem', 'aceito troca'],
  },
  {
    category: 'Imóveis',
    weight: 10,
    minPrice: 95000,
    maxPrice: 1850000,
    items: ['Apartamento 2 quartos', 'Casa 3 quartos', 'Kitnet mobiliada', 'Terreno 360 m²', 'Sala comercial 40 m²', 'Sobrado com quintal', 'Cobertura duplex', 'Sítio 2 hectares'],
    details: ['perto do centro', 'com garagem', 'documentação em dia', 'sol da manhã', 'condomínio baixo', 'pronto para morar'],
  },
  {
    category: 'Móveis',
    weight: 13,
    minPrice: 80,
    maxPrice: 4800,
    items: ['Sofá retrátil 3 lugares', 'Mesa de jantar 6 cadeiras', 'Guarda-roupa casal', 'Escrivaninha de madeira', 'Cama box queen', 'Rack para sala', 'Poltrona de leitura', 'Estante de aço'],
    details: ['bem conservado', 'madeira maciça', 'desmontado', 'retirar no local', 'entrego na cidade', 'pouco uso'],
  },
  {
    category: 'Eletrodomésticos',
    weight: 11,
    minPrice: 90,
    maxPrice: 5200,
    items: ['Geladeira frost free', 'Máquina de lavar 12 kg', 'Fogão 5 bocas', 'Micro-ondas 30 litros', 'Ar-condicionado 12000 BTU', 'Lava-louças 8 serviços', 'Cafeteira expresso', 'Aspirador robô'],
    details: ['funcionando', 'revisado', 'com nota fiscal', 'voltagem 110 V', 'voltagem 220 V', 'pouco uso'],
  },
  {
    category: 'Esportes',
    weight: 9,
    minPrice: 60,
    maxPrice: 7800,
    items: ['Bicicleta aro 29', 'Esteira dobrável', 'Prancha de surfe 6 pés', 'Kit de halteres 40 kg', 'Patins inline', 'Barraca para 4 pessoas', 'Raquete de tênis', 'Bicicleta ergométrica'],
    details: ['quadro de alumínio', 'pouco uso', 'com acessórios', 'revisada', 'ótimo estado'],
  },
  {
    category: 'Moda',
    weight: 8,
    minPrice: 25,
    maxPrice: 1400,
    items: ['Jaqueta de couro', 'Tênis de corrida 42', 'Bolsa de couro', 'Vestido de festa', 'Terno slim 48', 'Mochila impermeável', 'Óculos de sol', 'Bota de couro 39'],
    details: ['original', 'usado duas vezes', 'novo com etiqueta', 'ótimo estado', 'envio pelo correio'],
  },
  {
    category: 'Infantil',
    weight: 6,
    minPrice: 40,
    maxPrice: 2200,
    items: ['Carrinho de bebê', 'Berço com colchão', 'Cadeirinha para carro', 'Andador musical', 'Cadeira de alimentação', 'Bicicleta aro 16', 'Banheira com suporte'],
    details: ['higienizado', 'completo', 'pouco uso', 'dentro da validade', 'retirar no local'],
  },
  {
    category: 'Instrumentos',
    weight: 5,
    minPrice: 150,
    maxPrice: 12000,
    items: ['Violão de nylon', 'Guitarra com captadores novos', 'Teclado 61 teclas', 'Bateria acústica', 'Baixo de 5 cordas', 'Amplificador 50 W', 'Saxofone alto'],
    details: ['regulado', 'com case', 'bem conservado', 'cordas novas', 'aceito troca'],
  },
  {
    category: 'Ferramentas',
    weight: 4,
    minPrice: 50,
    maxPrice: 3800,
    items: ['Furadeira de impacto', 'Parafusadeira 12 V', 'Serra circular', 'Compressor 50 litros', 'Betoneira 150 litros', 'Máquina de solda', 'Jogo de chaves 120 peças'],
    details: ['com maleta', 'revisada', 'pouco uso', 'voltagem 220 V', 'nota fiscal'],
  },
];

const CITIES: Array<[string, string]> = [
  ['Vitória', 'ES'], ['Vila Velha', 'ES'], ['Serra', 'ES'], ['Cachoeiro de Itapemirim', 'ES'], ['Belo Horizonte', 'MG'],
  ['Juiz de Fora', 'MG'], ['Rio de Janeiro', 'RJ'], ['Niterói', 'RJ'], ['São Paulo', 'SP'], ['Campinas', 'SP'],
  ['Santos', 'SP'], ['Curitiba', 'PR'], ['Londrina', 'PR'], ['Florianópolis', 'SC'], ['Joinville', 'SC'],
  ['Porto Alegre', 'RS'], ['Salvador', 'BA'], ['Recife', 'PE'], ['Fortaleza', 'CE'], ['Goiânia', 'GO'], ['Brasília', 'DF'],
];

const DAY = 86_400_000;
const LIFETIMES_DAYS = [30, 45, 60, 90];

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function pickCategory(random: () => number): CategorySeed {
  const total = CATALOG.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of CATALOG) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return CATALOG[0]!;
}

function pickStatus(random: () => number): ListingStatus {
  const roll = random();
  if (roll < 0.58) return 'ativo';
  if (roll < 0.74) return 'pausado';
  if (roll < 0.89) return 'expirado';
  return 'vendido';
}

/** Preço em escala logarítmica, como no mundo real: muito item barato e pouco item caro. */
function pickPriceCents(entry: CategorySeed, random: () => number): number {
  const log = Math.log(entry.minPrice) + random() * (Math.log(entry.maxPrice) - Math.log(entry.minPrice));
  const reais = Math.exp(log);
  const step = reais >= 10000 ? 500 : reais >= 1000 ? 50 : reais >= 100 ? 10 : 5;
  return Math.max(Math.round(reais / step) * step, entry.minPrice) * 100;
}

function dailyViews(status: ListingStatus, popularity: number, random: () => number): number[] {
  const live = status === 'ativo';
  return Array.from({ length: 14 }, (_, index) => {
    // Só o anúncio ativo continua recebendo visitas; os outros zeram ao longo do período.
    const fade = live ? 1 : Math.max(0, 1 - index / 7);
    const weekend = index % 7 >= 5 ? 1.25 : 1;
    return Math.round(popularity * fade * weekend * (0.55 + random() * 0.9));
  });
}

export function generateListings(count = 1000, seed = 20261103, now = Date.now()): Listing[] {
  const random = mulberry32(seed);
  return Array.from({ length: count }, (_, index) => {
    const entry = pickCategory(random);
    const status = pickStatus(random);
    const [city, uf] = pick(CITIES, random);
    const popularity = 1 + Math.floor(random() ** 2.4 * 60);
    const viewsLast14Days = dailyViews(status, popularity, random);
    const recent = viewsLast14Days.reduce((sum, value) => sum + value, 0);
    const views = recent + Math.floor(popularity * random() * 40);
    const contacts = Math.floor(views * (0.005 + random() * 0.05));
    // Expirado passou do prazo há até 30 dias; os demais ainda estão dentro dele.
    const lifetimeDays = pick(LIFETIMES_DAYS, random);
    const ageDays =
      status === 'expirado' ? lifetimeDays + 1 + Math.floor(random() * 30) : Math.floor(random() * lifetimeDays);
    const createdAt = now - ageDays * DAY;
    const expiresAt = createdAt + lifetimeDays * DAY;
    return {
      id: `AN-${10001 + index}`,
      title: `${pick(entry.items, random)} ${pick(entry.details, random)}`,
      category: entry.category,
      priceCents: pickPriceCents(entry, random),
      status,
      city,
      uf,
      createdAt: new Date(createdAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      updatedAt: new Date(Math.min(now, createdAt + Math.floor(random() * 20) * DAY)).toISOString(),
      views,
      contacts,
      viewsLast14Days,
      version: 1,
    };
  });
}
