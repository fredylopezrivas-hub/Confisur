import React, { useState } from 'react';
import { Product } from '../types';
import { X, Plus, Trash2, LogOut, Upload, KeyRound, User, CheckCircle, FolderPlus, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: string[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  onDeleteProduct: (id: string) => void;
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
}

export function AdminPanel({ 
  isOpen, 
  onClose, 
  products, 
  categories,
  onAddProduct, 
  onDeleteProduct,
  onAddCategory,
  onDeleteCategory
}: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Form states for new product
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Category creation state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [catSuccess, setCatSuccess] = useState(false);

  // Set default category selection when dynamic categories change or mount
  React.useEffect(() => {
    if (categories.length > 0 && !newCategory) {
      setNewCategory(categories[0]);
    }
  }, [categories, newCategory]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'ronald' && password === 'confi321') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Usuario o contraseña incorrectos.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  // Convert uploaded image file to Base64 with automatic lightweight canvas compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Initialize canvas
          const canvas = document.createElement('canvas');
          const maxDimension = 600; // Optimal web catalog resolution
          let width = img.width;
          let height = img.height;

          // Maintain aspect ratio
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress image to JPEG at 0.65 quality (visually stunning, extremely lightweight ~35KB)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
            setNewImageUrl(compressedBase64);
            setPreviewError(false);
          } else {
            // Fallback to original Base64 if context 2D is unavailable
            setNewImageUrl(event.target?.result as string);
            setPreviewError(false);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newImageUrl) {
      alert('Por favor, completa todos los campos del producto, incluyendo la imagen.');
      return;
    }

    const catToUse = newCategory || (categories.length > 0 ? categories[0] : 'General');

    onAddProduct({
      name: newName,
      description: '', // Description removed entirely as requested by user
      price: 0, // Price is no longer needed/shown in catalog
      category: catToUse,
      imageUrl: newImageUrl,
    });

    // Reset Form
    setNewName('');
    setNewImageUrl('');
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 3000);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (categories.includes(trimmed)) {
      alert('Esta categoría ya existe.');
      return;
    }

    onAddCategory(trimmed);
    setNewCategoryName('');
    setNewCategory(trimmed); // Select newly created category
    setCatSuccess(true);
    setTimeout(() => setCatSuccess(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="relative w-full max-w-4xl bg-orange-50/90 dark:bg-zinc-950/95 backdrop-blur-md rounded-[32px] overflow-hidden shadow-2xl z-10 border border-orange-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KeyRound className="w-6 h-6 animate-pulse" />
            <div>
              <h2 className="text-xl font-display font-black">Panel de Administrador Secreto</h2>
              <p className="text-xs text-orange-100">
                {isAuthenticated ? 'Sesión: ronald • Administrar Catálogo' : 'Ingresa tus credenciales'}
              </p>
            </div>
          </div>
          <button
            id="close-admin-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-grow p-6 md:p-8">
          <AnimatePresence mode="wait">
            {!isAuthenticated ? (
              /* LOGIN SCREEN */
              <motion.div
                key="login-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-md mx-auto py-8"
              >
                <div className="text-center mb-6">
                  <span className="inline-block p-4 bg-orange-100 dark:bg-zinc-800 text-orange-500 dark:text-orange-400 rounded-full mb-3">
                    <User className="w-8 h-8" />
                  </span>
                  <p className="text-zinc-600 dark:text-zinc-300 text-sm">
                    Inicia sesión para poder adaptar productos, subir fotos y remover items del catálogo.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Nombre de Usuario (User)
                    </label>
                    <input
                      id="admin-username"
                      type="text"
                      required
                      placeholder="Ej. ronald"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-orange-200 dark:border-zinc-805 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Contraseña (Clave)
                    </label>
                    <input
                      id="admin-password"
                      type="password"
                      required
                      placeholder="Ingresa clave"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-orange-200 dark:border-zinc-805 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {loginError && (
                    <p className="text-red-500 text-xs font-medium bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
                      {loginError}
                    </p>
                  )}

                  <button
                    id="submit-login"
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-display font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all hover:scale-102 active:scale-95"
                  >
                    Ingresar al Panel
                  </button>
                </form>
              </motion.div>
            ) : (
              /* ADMIN PANEL CORE DASHBOARD */
              <motion.div
                key="admin-dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* COLUMN 1: NEW PRODUCT FORM & CATEGORY MAKER */}
                <div className="lg:col-span-5 space-y-6">
                  {/* ADD PRODUCT FORM */}
                  <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-orange-100/50 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="p-1.5 bg-orange-105 bg-orange-100 dark:bg-zinc-800 text-orange-500 rounded-lg">
                        <Plus className="w-5 h-5" />
                      </span>
                      <h3 className="font-display font-black text-base text-zinc-800 dark:text-zinc-100">
                        Nuevo Producto
                      </h3>
                    </div>

                    <form onSubmit={handleSubmitProduct} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">
                          Nombre del Dulce
                        </label>
                        <input
                          id="product-input-name"
                          type="text"
                          required
                          placeholder="Ej. Gomitas de Fresa"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-orange-50/20 dark:bg-zinc-950 border border-orange-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-105 focus:outline-none focus:ring-2 focus:ring-orange-400 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">
                          Categoría
                        </label>
                        <select
                          id="product-input-category"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-orange-50/20 dark:bg-zinc-950 border border-orange-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-105 focus:outline-none focus:ring-2 focus:ring-orange-400 text-xs"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Image Upload Area */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1.5">
                          Sube la Foto del Producto (Móvil o PC)
                        </label>
                        <div className="flex flex-col gap-3">
                          <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-orange-150 dark:border-zinc-800 hover:border-orange-400 dark:hover:border-orange-500 rounded-2xl cursor-pointer bg-orange-50/10 dark:bg-zinc-950/30 transition-colors">
                            <Upload className="w-5 h-5 text-orange-400 mb-1" />
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-450">
                              Clic para seleccionar o tomar foto
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              Soporta: JPG, PNG, WEBP (Max 2MB)
                            </span>
                            <input
                              id="photo-file-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>

                          {/* Image Preview */}
                          {newImageUrl && (
                            <div className="relative p-2 border border-orange-100 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img
                                  src={newImageUrl}
                                  alt="Vista previa"
                                  className="w-10 h-14 object-cover rounded-lg"
                                  onError={() => setPreviewError(true)}
                                />
                                <div>
                                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 block flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-ping" />
                                    Foto Lista
                                  </span>
                                  <span className="text-[10px] text-zinc-450">Adaptada al catálogo</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setNewImageUrl('')}
                                className="p-1 px-2 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 text-red-650 dark:text-red-400 rounded-xl text-xs font-bold"
                              >
                                Quitar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {formSuccess && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-905 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          <span>¡Dulce añadido con éxito!</span>
                        </div>
                      )}

                      <button
                        id="save-new-product"
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-display font-bold rounded-xl transition-all shadow-md shadow-orange-500/10 active:scale-95 text-xs cursor-pointer"
                      >
                        Añadir al Catálogo
                      </button>
                    </form>
                  </div>

                  {/* CATEGORIES MANAGEMENT SECTION */}
                  <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-orange-100/50 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="p-1.5 bg-amber-100 dark:bg-zinc-800 text-amber-500 rounded-lg">
                        <FolderPlus className="w-4 h-4" />
                      </span>
                      <h3 className="font-display font-black text-base text-zinc-800 dark:text-zinc-100">
                        Añadir Categorías
                      </h3>
                    </div>

                    <form onSubmit={handleCreateCategory} className="flex gap-2 mb-3">
                      <input
                        id="category-input-name"
                        type="text"
                        required
                        placeholder="Nueva Categoría (Ej: Combos)"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-grow px-3 py-2 rounded-xl bg-orange-50/20 dark:bg-zinc-950 border border-orange-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-400 text-xs"
                      />
                      <button
                        type="submit"
                        className="px-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Crear
                      </button>
                    </form>

                    {/* Categories tag list with delete */}
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto no-scrollbar">
                      {categories.map((cat) => (
                        <div 
                          key={cat} 
                          className="flex items-center justify-between p-2 rounded-xl bg-orange-50/20 dark:bg-zinc-950 border border-orange-100/10 dark:border-zinc-850"
                        >
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-350 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-amber-500" />
                            {cat}
                          </span>
                          {categories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Estás seguro de eliminar la categoría "${cat}"? Los productos en ella ya no saldrán en las pestañas principales.`)) {
                                  onDeleteCategory(cat);
                                }
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar Categoría"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: LIST & MANAGE PRODUCTS */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-black text-lg text-zinc-800 dark:text-zinc-100">
                        Productos ({products.length})
                      </h3>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 py-1.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Cerrar Sesión
                      </button>
                    </div>

                    <div className="overflow-y-auto max-h-[460px] pr-2 space-y-2 no-scrollbar">
                      {products.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-orange-200 dark:border-zinc-800 p-6">
                          <p className="text-zinc-400 text-sm">No hay productos en esta categoría o catálogo.</p>
                        </div>
                      ) : (
                        products.map((prod) => (
                          <div
                            key={prod.id}
                            className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-orange-50 dark:border-zinc-800/60 shadow-xs hover:border-orange-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-10 h-14 object-cover rounded-lg bg-orange-50/50"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?q=80&w=600&auto=format&fit=crop';
                                }}
                              />
                              <div>
                                <h4 className="font-display font-bold text-sm text-zinc-800 dark:text-zinc-100 line-clamp-1">
                                  {prod.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-black tracking-wide text-amber-500 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                                    {prod.category}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              id={`delete-product-${prod.id}`}
                              onClick={() => {
                                if (confirm(`¿Seguro que deseas eliminar "${prod.name}" del catálogo?`)) {
                                  onDeleteProduct(prod.id);
                                }
                              }}
                              className="p-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-500 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                              title="Remover Producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-orange-100/30 dark:bg-zinc-900 rounded-2xl border border-orange-200/50 text-[11px] text-zinc-650 dark:text-zinc-400 leading-relaxed">
                    <span className="font-bold text-orange-700 dark:text-orange-400 block mb-1">
                      💡 Sincronización en la Nube y Base de Datos:
                    </span>
                    Tus cambios se guardan automáticamente en tu base de datos de Firebase. Cualquier trabajador con este panel podrá añadir categorías, desactivar fotos o actualizar dulces al instante y se reflejará en vivo para todos tus clientes.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
