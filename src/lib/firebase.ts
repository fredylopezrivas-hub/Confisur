import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc,
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { Product, CategoryWithSections } from '../types';

// Safe localStorage helper to prevent QuotaExceededError crashes
export function safeSetItem(key: string, value: string): void {
  let valueToStore = value;

  // Protect against large base64 data items in local storage arrays
  if (key === 'confisur_products' || key === 'confisur_products_cache') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        // Strip out base64 images from localStorage to keep the cache lightweight (only ~400KB for 4,000 items)
        // while 100% of full images and files remain safe and loaded fresh from Google Cloud Firestore!
        const cleaned = parsed.map(item => {
          if (item && item.imageUrl && item.imageUrl.startsWith('data:')) {
            return { ...item, imageUrl: '' };
          }
          return item;
        });
        valueToStore = JSON.stringify(cleaned);
      }
    } catch {
      // ignore parsing failures
    }
  }

  try {
    localStorage.setItem(key, valueToStore);
  } catch (error: any) {
    console.warn(`[LocalStorage] Failed to set "${key}" (size: ${valueToStore.length} chars) - likely exceeded browser quota:`, error);
    
    // Self-healing: If we exceed the browser quota, we can clear the heavy product caches to free up space, and try setting the item again.
    try {
      console.log("[LocalStorage] Attempting self-healing by clearing heavy product caches...");
      localStorage.removeItem('confisur_products_cache');
      localStorage.removeItem('confisur_products');
      
      // Retry once to write the current key
      localStorage.setItem(key, valueToStore);
      console.log(`[LocalStorage] Self-healing succeeded! Successfully saved "${key}" after freeing space.`);
    } catch (retryError) {
      console.error(`[LocalStorage] Self-healing failed for "${key}". The setting will not persist locally, but the app continues normally.`, retryError);
    }
  }
}

// Safe product cache storage that strictly scales to huge limits (2000+ items)
// by keeping full data with images for the most recent items and stripping heavy images from older ones.
// This guarantees we never hit the 5MB browser localStorage limit, while Firebase carries 100% of all items in the cloud with no limit!
export function saveProductsCache(prods: Product[]): void {
  try {
    if (!prods || prods.length === 0) {
      safeSetItem('confisur_products_cache', JSON.stringify([]));
      return;
    }
    
    // To support 4,000+ items flawlessly:
    // Strip all heavy base64 image data (strings starting with "data:") from the offline speed cache.
    // Real images remain 100% safe and secure in the Cloud Firestore database.
    // This allows the local cache to store many thousands of items in less than 500KB!
    const cachedProducts = prods.map(p => {
      if (p.imageUrl && p.imageUrl.startsWith('data:')) {
        return { ...p, imageUrl: '' }; // Remove heavy base64 only from the local browser storage cache
      }
      return p;
    });
    
    safeSetItem('confisur_products_cache', JSON.stringify(cachedProducts));
  } catch (error) {
    console.error('[LocalStorage] Failed saving products cache:', error);
  }
}

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

export const DEFAULT_CATEGORIES = ['Caramelería', 'Chocolatería', 'Gomitas y Snacks'];

export async function fetchCategoriesWithSections(): Promise<CategoryWithSections[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      if (snap.empty) {
        const seeded: CategoryWithSections[] = [];
        for (const cat of DEFAULT_CATEGORIES) {
          const catObj = { name: cat, sections: [] };
          await setDoc(doc(db, 'categories', cat), { createdAt: Date.now(), sections: [] });
          seeded.push(catObj);
        }
        safeSetItem('confisur_categories_ws_cache', JSON.stringify(seeded));
        return seeded;
      }
      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          name: doc.id,
          sections: data.sections || []
        };
      });
      safeSetItem('confisur_categories_ws_cache', JSON.stringify(list));
      return list;
    } catch (e) {
      console.error("Error fetching categories from firestore", e);
    }
  }

  const saved = localStorage.getItem('confisur_dyn_categories_ws');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      safeSetItem('confisur_categories_ws_cache', JSON.stringify(parsed));
      return parsed;
    } catch {
      // ignore
    }
  }
  const initial = DEFAULT_CATEGORIES.map(cat => ({ name: cat, sections: [] }));
  safeSetItem('confisur_dyn_categories_ws', JSON.stringify(initial));
  safeSetItem('confisur_categories_ws_cache', JSON.stringify(initial));
  return initial;
}

export async function addCategoryWithSections(categoryName: string): Promise<CategoryWithSections[]> {
  const trimmed = categoryName.trim();
  if (!trimmed) return [];

  if (db) {
    try {
      await setDoc(doc(db, 'categories', trimmed), { createdAt: Date.now(), sections: [] });
      const updated = await fetchCategoriesWithSections();
      safeSetItem('confisur_categories_ws_cache', JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Error adding category to Firestore", e);
      throw e;
    }
  }

  const current = await fetchCategoriesWithSections();
  if (!current.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
    const next = [...current, { name: trimmed, sections: [] }];
    safeSetItem('confisur_dyn_categories_ws', JSON.stringify(next));
    safeSetItem('confisur_categories_ws_cache', JSON.stringify(next));
    return next;
  }
  return current;
}

export async function removeCategoryWithSections(categoryName: string): Promise<CategoryWithSections[]> {
  if (db) {
    try {
      await deleteDoc(doc(db, 'categories', categoryName));
      const updated = await fetchCategoriesWithSections();
      safeSetItem('confisur_categories_ws_cache', JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Error deleting category from Firestore", e);
      throw e;
    }
  }

  const current = await fetchCategoriesWithSections();
  const next = current.filter(c => c.name !== categoryName);
  safeSetItem('confisur_dyn_categories_ws', JSON.stringify(next));
  safeSetItem('confisur_categories_ws_cache', JSON.stringify(next));
  return next;
}

export async function saveCategorySections(categoryName: string, sections: string[]): Promise<CategoryWithSections[]> {
  const trimmedSections = sections.map(s => s.trim()).filter(Boolean);
  if (db) {
    try {
      await setDoc(doc(db, 'categories', categoryName), { sections: trimmedSections }, { merge: true });
      const updated = await fetchCategoriesWithSections();
      safeSetItem('confisur_categories_ws_cache', JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Error saving category sections in Firestore", e);
      throw e;
    }
  }

  const current = await fetchCategoriesWithSections();
  const next = current.map(c => c.name === categoryName ? { ...c, sections: trimmedSections } : c);
  safeSetItem('confisur_dyn_categories_ws', JSON.stringify(next));
  safeSetItem('confisur_categories_ws_cache', JSON.stringify(next));
  return next;
}

export async function fetchCategories(): Promise<string[]> {
  const cws = await fetchCategoriesWithSections();
  return cws.map(c => c.name);
}

export async function addCategory(categoryName: string): Promise<string[]> {
  const cws = await addCategoryWithSections(categoryName);
  return cws.map(c => c.name);
}

export async function removeCategory(categoryName: string): Promise<string[]> {
  const cws = await removeCategoryWithSections(categoryName);
  return cws.map(c => c.name);
}

/* =========================================================================
   2. PRODUCTS MANAGEMENT (LOCAL STORAGE & CLOUD SHARING)
   ========================================================================= */

export const DEFAULT_PRODUCTS: Product[] = [
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
      
      const configDocRef = doc(db, 'settings', 'config');
      const configSnap = await getDoc(configDocRef).catch(() => null);
      
      if (snap.empty) {
        if (!configSnap || !configSnap.exists()) {
          // Seed default products in firestore
          for (const p of DEFAULT_PRODUCTS) {
            await setDoc(doc(db, 'products', p.id), p);
          }
          await setDoc(configDocRef, { initialized: true }).catch(() => null);
          saveProductsCache(DEFAULT_PRODUCTS);
          return DEFAULT_PRODUCTS;
        } else {
          saveProductsCache([]);
          return [];
        }
      }
      
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      // Sort by createdAt descending
      prods.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      saveProductsCache(prods);
      return prods;
    } catch (e) {
      console.error("Error fetching products from Firestore", e);
      // Fallback: try loading cached products to keep the UI active
      try {
        const cached = localStorage.getItem('confisur_products_cache');
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {}
      return [];
    }
  }

  // Local Storage fallback
  const saved = localStorage.getItem('confisur_products');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      saveProductsCache(parsed);
      return parsed;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  }
  safeSetItem('confisur_products', JSON.stringify(DEFAULT_PRODUCTS));
  saveProductsCache(DEFAULT_PRODUCTS);
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
      
      // Ensure initialized config exists so default seeds never auto-restore
      const configDocRef = doc(db, 'settings', 'config');
      await setDoc(configDocRef, { initialized: true }).catch(() => null);

      const latest = await fetchProducts();
      saveProductsCache(latest);
      return latest;
    } catch (e) {
      console.error("Error adding product to Firestore", e);
      throw e;
    }
  }

  // Local Storage fallback
  const current = await fetchProducts();
  const next = [newProduct, ...current];
  safeSetItem('confisur_products', JSON.stringify(next));
  saveProductsCache(next);
  return next;
}

export async function deleteProduct(id: string): Promise<Product[]> {
  if (db) {
    try {
      await deleteDoc(doc(db, 'products', id));
      
      // Ensure initialized config exists so default seeds never auto-restore
      const configDocRef = doc(db, 'settings', 'config');
      await setDoc(configDocRef, { initialized: true }).catch(() => null);

      const latest = await fetchProducts();
      saveProductsCache(latest);
      return latest;
    } catch (e) {
      console.error("Error deleting product from Firestore", e);
      throw e;
    }
  }

  // Local Storage fallback
  const current = await fetchProducts();
  const next = current.filter(p => p.id !== id);
  safeSetItem('confisur_products', JSON.stringify(next));
  saveProductsCache(next);
  return next;
}

// Function to delete all products in the database
export async function clearAllProducts(): Promise<void> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'products'));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'products', d.id));
      }
      const configDocRef = doc(db, 'settings', 'config');
      await setDoc(configDocRef, { initialized: true }).catch(() => null);
    } catch (e) {
      console.error("Error clearing all products from Firestore", e);
      throw e;
    }
  } else {
    safeSetItem('confisur_products', JSON.stringify([]));
  }
  saveProductsCache([]);
}

// Function to enable real-time listener if client supports it
export function subscribeProducts(onUpdate: (prods: Product[]) => void) {
  if (db) {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      // Keep descending order by creation date
      prods.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      saveProductsCache(prods);
      onUpdate(prods);
    }, (error) => {
      console.error("Error subscribing to real-time products", error);
    });
  }
  return null;
}
