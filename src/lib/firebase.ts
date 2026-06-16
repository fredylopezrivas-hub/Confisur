import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  setDoc,
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { Product } from '../types';

// These environment variables can be populated in Vercel, Netlify, or locally in .env
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBik6f9Qc31AsVs0z4IkNvGPUDoBoFY-Xc",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "confisur-113cb.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "confisur-113cb",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "confisur-113cb.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "568590580755",
  appId: env.VITE_FIREBASE_APP_ID || "1:568590580755:web:b059b2a656649e19ec93e6",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-BSBBW940Y9"
};

// Check if we have at least apiKey and projectId configured
const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let db: any = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log("🔥 Firebase Firestore conectado con tu proyecto personal: confisur-113cb");
  } catch (error) {
    console.error("⚠️ Error inicializando Firebase:", error);
  }
} else {
  console.log("ℹ️ Firebase no configurado. Iniciando en Modo Local Resiliente (LocalStorage).");
}

/* =========================================================================
   1. CATEGORIES MANAGEMENT (LOCAL STORAGE & CLOUD SHARING)
   ========================================================================= */

const DEFAULT_CATEGORIES = ['Caramelería', 'Chocolatería', 'Gomitas y Snacks'];

export async function fetchCategories(): Promise<string[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      const list = snap.docs.map(doc => doc.id);
      if (list.length === 0) {
        // Seed default categories in Firestore if empty
        for (const cat of DEFAULT_CATEGORIES) {
          await setDoc(doc(db, 'categories', cat), { createdAt: Date.now() });
        }
        return DEFAULT_CATEGORIES;
      }
      return list;
    } catch (e) {
      console.error("Error fetching categories from firestore", e);
    }
  }

  // Fallback Local Storage Mode
  const saved = localStorage.getItem('confisur_dyn_categories');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }
  localStorage.setItem('confisur_dyn_categories', JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}

export async function addCategory(categoryName: string): Promise<string[]> {
  const trimmed = categoryName.trim();
  if (!trimmed) return [];

  if (db) {
    try {
      await setDoc(doc(db, 'categories', trimmed), { createdAt: Date.now() });
      return await fetchCategories();
    } catch (e) {
      console.error("Error adding category to Firestore", e);
      throw e;
    }
  }

  // Local Storage Mode
  const current = await fetchCategories();
  if (!current.includes(trimmed)) {
    const next = [...current, trimmed];
    localStorage.setItem('confisur_dyn_categories', JSON.stringify(next));
    return next;
  }
  return current;
}

export async function removeCategory(categoryName: string): Promise<string[]> {
  if (db) {
    try {
      await deleteDoc(doc(db, 'categories', categoryName));
      return await fetchCategories();
    } catch (e) {
      console.error("Error deleting category from Firestore", e);
      throw e;
    }
  }

  // Local Storage Mode
  const current = await fetchCategories();
  const next = current.filter(c => c !== categoryName);
  localStorage.setItem('confisur_dyn_categories', JSON.stringify(next));
  return next;
}

/* =========================================================================
   2. PRODUCTS MANAGEMENT (LOCAL STORAGE & CLOUD SHARING)
   ========================================================================= */

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'seed-1',
    name: 'Chupetas Arcoíris',
    description: '', // Description removed as requested by user
    price: 0, // Price removed/ignored in display
    category: 'Caramelería',
    imageUrl: 'https://i.imgur.com/eMTz1Ho.jpeg',
    createdAt: 1718534400000
  },
  {
    id: 'seed-2',
    name: 'Gomitas Ácidas Surtidas',
    description: '',
    price: 0,
    category: 'Caramelería',
    imageUrl: 'https://i.imgur.com/pQ9XCLT.jpeg',
    createdAt: 1718534401000
  },
  {
    id: 'seed-3',
    name: 'Bombones Crujientes Confisur',
    description: '',
    price: 0,
    category: 'Caramelería',
    imageUrl: 'https://i.imgur.com/7PtO8eM.jpeg',
    createdAt: 1718534402000
  },
  {
    id: 'seed-4',
    name: 'Caramelos Blandos Masticables',
    description: '',
    price: 0,
    category: 'Caramelería',
    imageUrl: 'https://i.imgur.com/CgxaaX0.jpeg',
    createdAt: 1718534403000
  },
  {
    id: 'seed-5',
    name: 'Dulces Rellenos Frutales',
    description: '',
    price: 0,
    category: 'Caramelería',
    imageUrl: 'https://i.imgur.com/oZkJHu2.jpeg',
    createdAt: 1718534404000
  }
];

export async function fetchProducts(): Promise<Product[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (snap.empty) {
        // Seed default products in firestore
        for (const p of DEFAULT_PRODUCTS) {
          await setDoc(doc(db, 'products', p.id), p);
        }
        return DEFAULT_PRODUCTS;
      }
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (e) {
      console.error("Error fetching products from Firestore", e);
    }
  }

  // Local Storage fallback
  const saved = localStorage.getItem('confisur_products');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_PRODUCTS;
    }
  }
  localStorage.setItem('confisur_products', JSON.stringify(DEFAULT_PRODUCTS));
  return DEFAULT_PRODUCTS;
}

export async function addProduct(prod: Omit<Product, 'id' | 'createdAt'>): Promise<Product[]> {
  const newId = 'prod-' + Date.now().toString();
  const newProduct: Product = {
    ...prod,
    id: newId,
    createdAt: Date.now()
  };

  if (db) {
    try {
      await setDoc(doc(db, 'products', newId), newProduct);
      return await fetchProducts();
    } catch (e) {
      console.error("Error adding product to Firestore", e);
      throw e;
    }
  }

  // Local Storage fallback
  const current = await fetchProducts();
  const next = [newProduct, ...current];
  localStorage.setItem('confisur_products', JSON.stringify(next));
  return next;
}

export async function deleteProduct(id: string): Promise<Product[]> {
  if (db) {
    try {
      await deleteDoc(doc(db, 'products', id));
      return await fetchProducts();
    } catch (e) {
      console.error("Error deleting product from Firestore", e);
      throw e;
    }
  }

  // Local Storage fallback
  const current = await fetchProducts();
  const next = current.filter(p => p.id !== id);
  localStorage.setItem('confisur_products', JSON.stringify(next));
  return next;
}

// Function to enable real-time listener if client supports it
export function subscribeProducts(onUpdate: (prods: Product[]) => void) {
  if (db) {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      onUpdate(prods);
    }, (error) => {
      console.error("Error subscribing to real-time products", error);
    });
  }
  return null;
}
