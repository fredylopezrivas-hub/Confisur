/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Product, Category } from './types';
import { ProductCard } from './components/ProductCard';
import { AdminPanel } from './components/AdminPanel';
import { SedesContacts } from './components/SedesContacts';
import { 
  fetchProducts, 
  addProduct, 
  deleteProduct, 
  fetchCategories, 
  addCategory, 
  removeCategory,
  subscribeProducts,
  clearAllProducts
} from './lib/firebase';
import { 
  Search, 
  Sun, 
  Moon, 
  Instagram, 
  ShoppingBag, 
  Lock, 
  Compass, 
  Sparkles, 
  LayoutGrid, 
  ArrowRight,
  SlidersHorizontal,
  Layers,
  Heart,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Load products and custom categories from firebase or defaults with instant cache hydration
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('confisur_products_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('confisur_categories_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Dark Mode state (Predeterminado: Modo Blanco / Claro)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('confisur_darkmode_v2');
    if (savedMode === null) {
      return false; // El modo blanco es el predeterminado
    }
    return savedMode === 'true';
  });

  // Filters & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Todos'>('Todos');
  const [viewMode, setViewMode] = useState<'slide' | 'grid'>('slide');

  // Popup states
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // References for dragging products carousel
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // References for dragging category filters
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [isCatDragging, setIsCatDragging] = useState(false);
  const [catStartX, setCatStartX] = useState(0);
  const [catScrollLeft, setCatScrollLeft] = useState(0);

  const handleCatMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!categoriesRef.current) return;
    setIsCatDragging(true);
    setCatStartX(e.pageX - categoriesRef.current.offsetLeft);
    setCatScrollLeft(categoriesRef.current.scrollLeft);
  };

  const handleCatMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCatDragging || !categoriesRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoriesRef.current.offsetLeft;
    const walk = (x - catStartX) * 1.8; // scroll speed multiplier
    categoriesRef.current.scrollLeft = catScrollLeft - walk;
  };

  const handleCatMouseUpOrLeave = () => {
    setIsCatDragging(false);
  };

  // Load products and dynamic categories on mount
  useEffect(() => {
    // 1. Fetch Categories
    fetchCategories().then((cats) => {
      setCategories(cats);
    });

    // 2. Fetch Initial list of Products
    fetchProducts().then((prods) => {
      setProducts(prods);
      setIsDbLoaded(true);
    });

    // 3. Keep real-time synchronized to sub
    const unsub = subscribeProducts((updatedProds) => {
      setProducts(updatedProds);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Apply dark mode toggling to documents body
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('confisur_darkmode_v2', String(isDarkMode));
  }, [isDarkMode]);

  // Handle adding newly adapted products
  const handleAddProduct = async (newProdData: Omit<Product, 'id' | 'createdAt'>) => {
    // Generate an optimistic ID so it renders instantly
    const tempId = 'prod-temp-' + Date.now();
    const tempProduct: Product = {
      ...newProdData,
      id: tempId,
      createdAt: Date.now()
    };

    // Update UI instantly
    setProducts(prev => {
      const next = [tempProduct, ...prev];
      localStorage.setItem('confisur_products_cache', JSON.stringify(next));
      return next;
    });

    try {
      const updatedList = await addProduct(newProdData);
      setProducts(updatedList);
    } catch (e: any) {
      console.error(e);
      // Revert optimism if it failed
      setProducts(prev => {
        const next = prev.filter(p => p.id !== tempId);
        localStorage.setItem('confisur_products_cache', JSON.stringify(next));
        return next;
      });
      alert("❌ Error al guardar en Firebase:\n\nTu base de datos Firebase personal rechazó la escritura. Esto pasa si tus 'Reglas de Seguridad' (Security Rules) en Firebase Console no permiten escribir.\n\nPara solucionarlo:\n1. Ve a console.firebase.google.com\n2. Consola de Cloud Firestore -> pestaña de 'Rules' (Reglas)\n3. Configúralas de forma abierta:\n\nallow read, write: if true;");
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async (id: string) => {
    // Save previous state for rollback
    let previousProducts: Product[] = [];
    setProducts(prev => {
      previousProducts = prev;
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem('confisur_products_cache', JSON.stringify(next));
      return next;
    });

    try {
      const updatedList = await deleteProduct(id);
      setProducts(updatedList);
    } catch (e: any) {
      console.error(e);
      // Rollback to previous state
      setProducts(previousProducts);
      localStorage.setItem('confisur_products_cache', JSON.stringify(previousProducts));
      alert("❌ Error al eliminar en Firebase:\n\nTu base de datos Firebase personal rechazó borrar el producto. Esto pasa si tus reglas de seguridad están activas en modo restrictivo.\n\nPara solucionarlo:\n1. Ve a console.firebase.google.com -> selecciona tu proyecto 'confisur-113cb'\n2. Firestore Database -> pestaña de 'Rules' (Reglas)\n3. Cámbialas a:\n\nallow read, write: if true;");
    }
  };

  // Handle clearing all products at once from catalog
  const handleClearAllProducts = async () => {
    // Save previous state for rollback
    let previousProducts: Product[] = [];
    setProducts(prev => {
      previousProducts = prev;
      localStorage.setItem('confisur_products_cache', JSON.stringify([]));
      return [];
    });

    try {
      await clearAllProducts();
      setProducts([]);
    } catch (e: any) {
      console.error(e);
      // Rollback to previous state
      setProducts(previousProducts);
      localStorage.setItem('confisur_products_cache', JSON.stringify(previousProducts));
      alert("❌ Error al vaciar el catálogo en Firebase:\n\nLa base de datos Firebase personal rechazó la operación de borrado masivo por temas de Reglas de Seguridad.\n\nPara solucionarlo:\n1. Ve a console.firebase.google.com -> proyecto 'confisur-113cb'\n2. Firestore Database -> pestaña 'Rules' (Reglas)\n3. Copia e ingresa las reglas públicas:\n\nallow read, write: if true;");
    }
  };

  // Handle adding new custom category from the administrator panel
  const handleAddCategory = async (categoryName: string) => {
    try {
      const updatedCategories = await addCategory(categoryName);
      setCategories(updatedCategories);
    } catch (e: any) {
      console.error(e);
      alert("❌ Error al añadir categoría en Firebase. Verifica tus Reglas de Seguridad en Firestore.");
    }
  };

  // Handle category deletion from the administrator panel
  const handleDeleteCategory = async (categoryName: string) => {
    try {
      const updatedCategories = await removeCategory(categoryName);
      setCategories(updatedCategories);
      if (selectedCategory === categoryName) {
        setSelectedCategory('Todos');
      }
    } catch (e: any) {
      console.error(e);
      alert("❌ Error al eliminar categoría en Firebase. Verifica tus Reglas de Seguridad en Firestore.");
    }
  };

  // Secret logo click count to unlock the Admin Panel silently
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setIsAdminOpen(true);
        // Reset logo clicks after opening
        return 0;
      }
      return next;
    });
  };

  // Drag-to-Scroll handlers for mouse users
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.8; // scroll speed multiplier
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Filtered Products List
  const filteredProducts = products.filter((prod) => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prod.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || prod.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate product count per category
  const getCategoryCount = (cat: Category) => {
    return products.filter((p) => p.category === cat).length;
  };

  // Redirect link for ordering
  const orderRedirectUrl = "https://www.atom.bio/confiteriadelsur?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZnRzaASeYmhleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAadZSBXO_O_8gFg0eerk6KMk8-4gbnPKWxxU-xfaM1L6CSeR77fRYmYvdIkS0A_aem_5IdzES54hadS0B2wmRz26A";

  return (
    <div className="min-h-screen bg-orange-50/20 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 selection:bg-orange-200">
      
      {/* GLOWING ORANGE HEADER DECORATION */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-400/15 dark:bg-orange-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-amber-300/20 dark:bg-amber-400/5 blur-[120px] rounded-full pointer-events-none" />

      {/* FLOAT ACTION BUTTON: "HAZ TU PEDIDO" */}
      <motion.a
        id="floating-order-btn"
        href={orderRedirectUrl}
        target="_blank"
        rel="noreferrer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 py-4 px-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-display font-black rounded-full shadow-2xl shadow-orange-500/40 hover:shadow-orange-500/50 border border-white/20"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <ShoppingBag className="w-5 h-5" />
        <span className="text-sm md:text-base">Haz tu Pedido</span>
      </motion.a>

      {/* MAIN TOP BAR */}
      <nav id="main-navigation" className="sticky top-0 z-30 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border-b border-orange-100/30 dark:border-zinc-850/30 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.img
              initial={{ rotate: -5, scale: 0.9 }}
              animate={{ rotate: 5, scale: 1 }}
              transition={{ repeat: Infinity, duration: 3, repeatType: "reverse" }}
              src="https://i.imgur.com/GlhA4J0.png"
              alt="Logo Confitería del Sur"
              onClick={handleLogoClick}
              className="w-12 h-12 object-contain rounded-full border-2 border-orange-400 bg-white dark:bg-zinc-800 p-0.5 shadow-md shadow-orange-500/10 cursor-pointer active:scale-95 transition-transform"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="font-display font-black text-xl tracking-tight bg-gradient-to-r from-orange-550 to-amber-500 bg-clip-text text-transparent">
                Confisur
              </span>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                Confitería del Sur
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Instagram Quick Header Button */}
            <a
              id="header-instagram-link"
              href="https://www.instagram.com/confisur2?igsh=MWEwMjBmbWNraG5mdQ=="
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-full hover:bg-orange-50 dark:hover:bg-zinc-800 text-pink-650 hover:text-orange-500 transition-colors flex items-center justify-center"
              title="Visita nuestro Instagram"
            >
              <Instagram className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            </a>

            {/* Dark Mode Switch */}
            <button
              id="dark-mode-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-full bg-orange-50 dark:bg-zinc-800 text-orange-600 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all"
              title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-orange-600" />}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO HERO SECTION */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-3xl mx-auto bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-[36px] p-6 md:p-10 shadow-xl shadow-orange-500/15 overflow-hidden border border-white/10"
        >
          {/* Abstract background circles */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex flex-col items-center">
            <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Sabor que enamora • 100% Calidad
            </span>
            <h1 className="text-3xl md:text-5xl font-display font-black leading-tight tracking-tight">
              ¡Bienvenidos a nuestra <br />
              <span className="underline decoration-amber-300 decoration-wavy underline-offset-8">Confitería del Sur</span>!
            </h1>
            <p className="max-w-xl mx-auto text-sm md:text-base text-orange-50 mt-4 leading-relaxed">
              Explora nuestro delicioso catálogo interactivo. Desliza con libertad tus dedos o mouse para ver los dulces más frescos en Maracaibo y San Francisco.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 justify-center items-center">
              <span className="text-xs bg-zinc-950/25 p-2 rounded-xl text-orange-200">
                ⭐ Delivery & Retiros
              </span>
              <span className="text-xs bg-zinc-950/25 p-2 rounded-xl text-orange-200">
                🍬 Precios de Confisur
              </span>
            </div>
          </div>
        </motion.div>
      </header>

      {/* FILTERS & SEARCH MODULE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-orange-100/50 dark:border-zinc-850/70">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Search inputs */}
            <div className="lg:col-span-4 relative flex items-center">
              <Search className="w-5 h-5 absolute left-3.5 text-zinc-400 dark:text-zinc-500" />
              <input
                id="catalog-search-bar"
                type="text"
                placeholder="Busca gomitas, chocolates, o caramelos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-orange-50/40 dark:bg-zinc-950 border border-orange-100 dark:border-zinc-800/80 rounded-2xl text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-zinc-800 dark:text-zinc-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 p-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category horizontal filters */}
            <div 
              ref={categoriesRef}
              onMouseDown={handleCatMouseDown}
              onMouseMove={handleCatMouseMove}
              onMouseUp={handleCatMouseUpOrLeave}
              onMouseLeave={handleCatMouseUpOrLeave}
              className="lg:col-span-6 flex items-center overflow-x-auto gap-2 no-scrollbar py-1 cursor-grab active:cursor-grabbing select-none"
            >
              <button
                id="filter-cat-todos"
                onClick={() => setSelectedCategory('Todos')}
                className={`flex-shrink-0 px-4.5 py-2.5 rounded-2xl font-display font-bold text-xs transition-all ${
                  selectedCategory === 'Todos'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-zinc-50 dark:bg-zinc-805 text-zinc-600 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-zinc-800'
                }`}
              >
                🎒 Todos ({products.length})
              </button>

              {categories.map((cat) => {
                const count = getCategoryCount(cat);
                return (
                  <button
                    key={cat}
                    id={`filter-cat-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-shrink-0 px-4.5 py-2.5 rounded-2xl font-display font-semibold text-xs transition-all flex items-center gap-1.5 ${
                      selectedCategory === cat
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-805 text-zinc-600 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-zinc-805'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      selectedCategory === cat 
                        ? 'bg-white/20 text-white' 
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Layout representation switches */}
            <div className="lg:col-span-2 flex items-center justify-end gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-400 font-semibold hidden xl:inline">Vista:</span>
              <button
                id="layout-toggle-slide"
                onClick={() => setViewMode('slide')}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === 'slide'
                    ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-650'
                    : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                }`}
                title="Deslizable en Hilera"
              >
                <Compass className="w-5 h-5" />
              </button>
              <button
                id="layout-toggle-grid"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === 'grid'
                    ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-650'
                    : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                }`}
                title="Lista en Canvases de Cuadrícula"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* PRODUCT DISPLAY BODY */}
      <main id="catalog-products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* If products are still fetching and there's no cached data */}
        {!isDbLoaded && products.length === 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-orange-400 rounded-full" />
                <div className="w-40 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              </div>
              <div className="w-32 h-4 bg-zinc-150 dark:bg-zinc-850 rounded-lg" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-zinc-900 rounded-[24px] border border-orange-50/70 dark:border-zinc-800/80 overflow-hidden flex flex-col justify-between animate-pulse"
                >
                  <div className="w-full aspect-[4/5] bg-orange-50/10 dark:bg-zinc-800/30" />
                  <div className="p-3.5 space-y-2 flex-grow flex flex-col justify-between">
                    <div className="w-4/5 h-4 bg-zinc-200 dark:bg-zinc-850 rounded" />
                    <div className="w-2/5 h-3 bg-zinc-150 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-sm border border-dashed border-orange-105 dark:border-zinc-800">
            <span className="text-5xl">🍭</span>
            <h3 className="font-display font-black text-xl text-zinc-700 dark:text-zinc-300 mt-4">
              Próximamente más delicias
            </h3>
            <p className="text-zinc-400 text-sm mt-1 max-w-sm mx-auto">
              Estamos preparando nuevas y exquisitas sorpresas en esta sección para consentir tu paladar muy pronto.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-orange-550 rounded-full animate-bounce" />
                <h2 className="font-display font-black text-xl md:text-2xl text-zinc-850 dark:text-zinc-50">
                  {selectedCategory === 'Todos' ? 'Nuestras Delicias' : selectedCategory}
                </h2>
              </div>
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                Mostrando {filteredProducts.length} dulces
              </span>
            </div>

            {/* MAIN PORTRAIT/LANDSCAPE VIEW TOGGLER */}
            {viewMode === 'slide' ? (
              /* SLIDER VIEW - SWIPEABLE WITH HAND, GESTURE, OR DRAGGING */
              <div className="relative group">
                
                {/* Scroll Indicator icons for desktop */}
                <div className="absolute inset-y-0 -left-4 w-12 bg-gradient-to-r from-orange-50/40 dark:from-zinc-950 to-transparent pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-y-0 -right-4 w-12 bg-gradient-to-l from-orange-50/40 dark:from-zinc-950 to-transparent pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div
                  ref={carouselRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  className={`flex gap-5 overflow-x-auto py-4 px-1 snap-x scroll-smooth no-scrollbar ${
                    isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
                  }`}
                  style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
                >
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="snap-start flex-shrink-0">
                      <ProductCard
                        product={product}
                      />
                    </div>
                  ))}
                </div>

                <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 flex items-center justify-center gap-1.5">
                  <span>👈 Desliza para ver más dulces de Confisur 👉</span>
                </p>
              </div>
            ) : (
              /* GRID VIEW */
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-4"
              >
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        )}

        {/* INSTAGRAM BANNER */}
        <section className="mt-12 bg-radial from-orange-100/50 to-orange-200/20 dark:from-zinc-900/40 dark:to-zinc-950 rounded-[32px] p-6 md:p-8 border border-orange-100/30 dark:border-zinc-800 text-center">
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="flex items-center gap-4 mb-2">
              <span className="p-3 bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 text-white rounded-3xl shadow-md transform -rotate-6 transition-transform hover:scale-110">
                <Instagram className="w-8 h-8" />
              </span>
              <motion.a
                id="footer-inline-brand-logo"
                href="https://www.instagram.com/confisur2?igsh=MWEwMjBmbWNraG5mdQ=="
                target="_blank"
                rel="noreferrer"
                animate={{ 
                  rotate: [6, -2, 10, 6],
                  scale: [1, 1.05, 0.95, 1]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 4, 
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
                whileHover={{ scale: 1.15, rotate: -6 }}
                className="w-14 h-14 rounded-3xl bg-white dark:bg-zinc-800 border-2 border-orange-200 dark:border-zinc-700 p-1 shadow-md shadow-orange-500/10 cursor-pointer flex items-center justify-center transform rotate-6"
                title="Confitería del Sur Oficial"
              >
                <img
                  src="https://i.imgur.com/GlhA4J0.png"
                  alt="Logo Confisur"
                  className="w-full h-full object-contain rounded-2xl animate-pulse"
                  referrerPolicy="no-referrer"
                />
              </motion.a>
            </div>
            <h3 className="font-display font-black text-xl text-zinc-850 dark:text-zinc-100 mt-2">
              ¡Síguenos en @confisur2!
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1 mb-5">
              Compartimos combos semanales, combos fiesteros y nuevos ingresos de dulces masticables listos para ti.
            </p>
            <a
              id="body-instagram-button"
              href="https://www.instagram.com/confisur2?igsh=MWEwMjBmbWNraG5mdQ=="
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-display font-bold text-sm rounded-full shadow-lg shadow-pink-500/20 transition-all hover:scale-102 active:scale-95"
            >
              Ver Instagram Oficial
            </a>
          </div>
        </section>

        {/* SEDE CONTACTS */}
        <SedesContacts />
      </main>

      {/* FOOTER & SECRET BUTTON ENTRY */}
      <footer className="bg-white dark:bg-zinc-950 border-t border-orange-100 dark:border-zinc-900/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <img
                  src="https://i.imgur.com/GlhA4J0.png"
                  alt="Logo"
                  className="w-9 h-9 object-contain rounded-full border border-orange-400 bg-white dark:bg-zinc-805 p-0.5"
                  referrerPolicy="no-referrer"
                />
                <span className="font-display font-bold text-lg text-orange-650">Confitería del Sur</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 leading-relaxed">
                ¡Los mejores dulces para alegrar tu paladar! Venta al por mayor y detal de caramelería, gomitas y deliciosos chocolates de alta calidad.
              </p>
            </div>

            <div className="flex justify-center gap-4">
              <a
                id="footer-instagram"
                href="https://www.instagram.com/confisur2?igsh=MWEwMjBmbWNraG5mdQ=="
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-orange-50 hover:bg-orange-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-orange-600 dark:text-orange-400 rounded-full transition-colors"
                title="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                id="footer-whatsapp-delicias"
                href="https://api.whatsapp.com/send/?phone=584144536647&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-orange-50 hover:bg-orange-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-orange-600 dark:text-orange-400 rounded-full transition-colors font-semibold text-xs flex items-center gap-1"
                title="Sede Delicias Chat"
              >
                <span>💬 Sede Delicias</span>
              </a>
              <a
                id="footer-whatsapp-sierra"
                href="https://api.whatsapp.com/send/?phone=584246020247&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-orange-50 hover:bg-orange-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-orange-600 dark:text-orange-400 rounded-full transition-colors font-semibold text-xs flex items-center gap-1"
                title="Sede Sierra Maestra Chat"
              >
                <span>💬 Sede Sierra</span>
              </a>
            </div>

            {/* Premium details column */}
            <div className="flex flex-col items-center md:items-end justify-center">
              <span className="text-xs bg-orange-100/50 dark:bg-zinc-900 border border-orange-200/50 dark:border-zinc-800 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-xl font-display font-black">
                ✨ Confitería Premium
              </span>
              <p className="text-[10px] text-zinc-400 mt-2 text-center md:text-right leading-relaxed">
                Ventas al mayor y detal con envíos rápidos en Maracaibo y San Francisco.
              </p>
            </div>
          </div>

          <hr className="border-orange-50 dark:border-zinc-800/60 my-6" />

          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p 
              className="text-[10px] text-zinc-400 cursor-default select-none"
              onClick={handleLogoClick}
              title="Confitería del Sur"
            >
              &copy; {new Date().getFullYear()} Confitería del Sur. Todos los derechos reservados.
            </p>
            <p className="text-[9px] text-zinc-350 dark:text-zinc-500">
              Maracaibo • San Francisco, Venezuela.
            </p>

            {/* Hidden admin trigger: completely invisible 1x1 pixel block */}
            <div
              id="secret-admin-entrance"
              onClick={() => setIsAdminOpen(true)}
              className="w-1.5 h-1.5 opacity-0 absolute bottom-0 right-0 select-none cursor-default"
              style={{ fontSize: '1px' }}
            />
          </div>
        </div>
      </footer>

      {/* POPUP MODALS */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        products={products}
        categories={categories}
        onAddProduct={handleAddProduct}
        onDeleteProduct={handleDeleteProduct}
        onClearAllProducts={handleClearAllProducts}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
      />

    </div>
  );
}
