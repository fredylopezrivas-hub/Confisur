export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  createdAt: number;
}

export type Category = string;

export const INITIAL_CATEGORIES: Category[] = [
  'Caramelería',
  'Chocolatería',
  'Gomitas y Snacks'
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'seed-1',
    name: 'Chupetas Arcoíris',
    description: 'Deliciosas chupetas de sabores frutales con colores brillantes para alegrar tu día.',
    price: 1.50,
    category: 'Caramelería',
    imageUrl: 'https://i.imgur.com/eMTz1Ho.jpeg',
    createdAt: 1718534400000 // June 16, 2024
  },
  {
    id: 'seed-2',
    name: 'Gomitas Ácidas Surtidas',
    description: 'Un festival de gomitas con una cobertura súper ácida y corazones dulces.',
    price: 2.20,
    category: 'Caramelería',
    imageUrl: 'https://i.imgur.com/pQ9XCLT.jpeg',
    createdAt: 1718534401000
  },
  {
    id: 'seed-3',
    name: 'Bombones Crujientes Confisur',
    description: 'Bombones con relleno cremoso y una cobertura crujiente espectacular.',
    price: 3.50,
    category: 'Caramelería',
    imageUrl: 'https://i.imgur.com/7PtO8eM.jpeg',
    createdAt: 1718534402000
  },
  {
    id: 'seed-4',
    name: 'Caramelos Blandos Masticables',
    description: 'El clásico caramelo blando que se derrite en tu boca, sabor original.',
    price: 1.80,
    category: 'Caramelería',
    imageUrl: 'https://i.imgur.com/CgxaaX0.jpeg',
    createdAt: 1718534403000
  },
  {
    id: 'seed-5',
    name: 'Dulces Rellenos Frutales',
    description: 'Caramelos duros con una sorpresa líquida y frutal en su interior.',
    price: 2.50,
    category: 'Caramelería',
    imageUrl: 'https://i.imgur.com/oZkJHu2.jpeg',
    createdAt: 1718534404000
  }
];
