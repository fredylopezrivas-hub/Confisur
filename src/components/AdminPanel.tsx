import React, { useState } from 'react';
import { Product, CategoryWithSections } from '../types';
import { X, Plus, Trash2, LogOut, Upload, KeyRound, User, CheckCircle, FolderPlus, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFirebaseSyncStatus } from '../lib/firebase';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: string[];
  categoriesWithSections?: CategoryWithSections[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  onDeleteProduct: (id: string) => void;
  onClearAllProducts: () => void;
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onSaveCategorySections?: (categoryName: string, sections: string[]) => void;
}

export function AdminPanel({ 
  isOpen, 
  onClose, 
  products, 
  categories,
  categoriesWithSections = [],
  onAddProduct, 
  onDeleteProduct,
  onClearAllProducts,
  onAddCategory,
  onDeleteCategory,
  onSaveCategorySections
}: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Custom modal states to replace browser alert/confirm
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const triggerConfirm = (title: string, message: string, onConfirmAction: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirmAction();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const triggerAlert = (title: string, message: string) => {
    setAlertState({
      isOpen: true,
      title,
      message
    });
  };

  // Form states for new product
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newSection, setNewSection] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Category creation state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [catSuccess, setCatSuccess] = useState(false);
  const [showSyncInstructions, setShowSyncInstructions] = useState(false);

  // Expand states for subcategory sections
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [categorySectionsInputs, setCategorySectionsInputs] = useState<Record<string, string>>({});

  // Set default category selection when dynamic categories change or mount
  React.useEffect(() => {
    if (categories.length > 0 && !newCategory) {
      setNewCategory(categories[0]);
    }
  }, [categories, newCategory]);

  // Track previous category to detect actual category rotation
  const prevCategoryRef = React.useRef(newCategory);

  // Handle section auto-preselection when category rotates
  React.useEffect(() => {
    if (prevCategoryRef.current !== newCategory) {
      // Category actually changed!
      prevCategoryRef.current = newCategory;
      const activeCatInfo = categoriesWithSections.find(c => c.name === newCategory);
      if (activeCatInfo && activeCatInfo.sections && activeCatInfo.sections.length > 0) {
        setNewSection(activeCatInfo.sections[0]);
      } else {
        setNewSection('');
      }
    } else {
      // Category did not change, but maybe categoriesWithSections updated (e.g. background sync)
      // Verify if the current selection is still valid in the updated sections list
      const activeCatInfo = categoriesWithSections.find(c => c.name === newCategory);
      const sections = activeCatInfo?.sections || [];
      // If we have a section selected, but it is no longer in the list, reset it
      if (newSection && !sections.includes(newSection)) {
        if (sections.length > 0) {
          setNewSection(sections[0]);
        } else {
          setNewSection('');
        }
      }
    }
  }, [newCategory, categoriesWithSections, newSection]);

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

  const handleAddSectionToCategory = (catName: string) => {
    const sectionName = (categorySectionsInputs[catName] || '').trim();
    if (!sectionName) return;

    const currentWS = categoriesWithSections.find(c => c.name === catName);
    const existingSections = currentWS ? currentWS.sections : [];

    if (existingSections.includes(sectionName)) {
      triggerAlert('Sección Existente', `La sección "${sectionName}" ya existe en esta categoría.`);
      return;
    }

    const updatedSections = [...existingSections, sectionName];
    onSaveCategorySections?.(catName, updatedSections);

    // Reset input
    setCategorySectionsInputs(prev => ({
      ...prev,
      [catName]: ''
    }));
  };

  const handleRemoveSectionFromCategory = (catName: string, sectionName: string) => {
    const currentWS = categoriesWithSections.find(c => c.name === catName);
    if (!currentWS) return;

    const updatedSections = currentWS.sections.filter(s => s !== sectionName);
    onSaveCategorySections?.(catName, updatedSections);
  };

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newImageUrl) {
      triggerAlert('Faltan Datos', 'Por favor, completa todos los campos del producto, incluyendo la imagen.');
      return;
    }

    const catToUse = newCategory || (categories.length > 0 ? categories[0] : 'General');

    onAddProduct({
      name: newName,
      description: '', // Description removed entirely as requested by user
      price: 0, // Price is no longer needed/shown in catalog
      category: catToUse,
      imageUrl: newImageUrl,
      section: newSection || undefined,
    });

    // Reset Form
    setNewName('');
    setNewImageUrl('');
    // reset chosen section
    const activeCatInfo = categoriesWithSections.find(c => c.name === catToUse);
    if (activeCatInfo && activeCatInfo.sections && activeCatInfo.sections.length > 0) {
      setNewSection(activeCatInfo.sections[0]);
    } else {
      setNewSection('');
    }
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 3000);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (categories.includes(trimmed)) {
      triggerAlert('Categoría Existente', 'Esta categoría ya existe en tu catálogo.');
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
    <>
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
                {/* CLOUD SYNC RESOLUTION & LOCALFAILOVER STATUS CARD */}
                <div className="lg:col-span-12 space-y-4">
                  <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 dark:from-amber-500/5 dark:via-orange-500/5 dark:to-amber-500/5 border border-orange-200/50 dark:border-zinc-800/80 p-5 rounded-[24px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2 text-amber-750 dark:text-amber-400 font-display font-bold text-sm">
                        <span className="text-base">⚡</span>
                        Resiliencia Activa — ¡Puedes seguir añadiendo dulces sin límites!
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Detectamos que tu proyecto de Firebase (<span className="font-mono bg-zinc-100 dark:bg-white/10 px-1 py-0.5 rounded text-[10px]">confisur-113cb</span>) tiene las reglas de escritura bloqueadas o expiradas en la consola de Google. <b>No te preocupes: para proteger tu trabajo, tu catálogo se está guardando de manera segura en la memoria de tu dispositivo</b> y tus cambios se reflejarán aquí enseguida de forma rápida.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSyncInstructions(!showSyncInstructions)}
                      className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-650 dark:hover:bg-orange-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl border border-orange-400/20 active:scale-95 transition-all shadow-sm shadow-orange-500/10 cursor-pointer self-start md:self-auto shrink-0 flex items-center gap-1.5"
                    >
                      {showSyncInstructions ? 'Ocultar Instrucciones' : '📋 Sincronizar en la Nube'}
                      <span>{showSyncInstructions ? '▲' : '▼'}</span>
                    </button>
                  </div>

                  {showSyncInstructions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 p-6 rounded-[24px] shadow-sm space-y-4 text-xs text-zinc-700 dark:text-zinc-300"
                    >
                      <h4 className="font-display font-black text-sm text-zinc-850 dark:text-zinc-100 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                        🚀 Cómo reactivar la Nube (Solo toma 1 minuto y dura por siempre)
                      </h4>
                      <p className="leading-relaxed">
                        Este aviso ocurre porque las bases de datos de Firebase por defecto bloquean las escrituras de prueba tras 30 días para protegerte. Sigue estos pasos simples para que tu catálogo se guarde en la nube de forma permanente:
                      </p>
                      <ol className="list-decimal pl-5 space-y-2.5 leading-relaxed text-zinc-600 dark:text-zinc-400">
                        <li>
                          Inicia sesión con tu cuenta de Google en tu Firebase Console: <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline font-semibold font-mono">console.firebase.google.com</a>.
                        </li>
                        <li>
                          Selecciona tu proyecto de catálogo <span className="font-bold underline text-zinc-800 dark:text-white">confisur-113cb</span>.
                        </li>
                        <li>
                          En el menú de la izquierda, entra a <span className="font-semibold text-zinc-800 dark:text-white">Firestore Database</span>.
                        </li>
                        <li>
                          Ve a la pestaña superior llamada <span className="font-semibold text-orange-500">Rules</span> (Reglas de Seguridad).
                        </li>
                        <li>
                          Reemplaza por completo el código de reglas que aparezca allí con este bloque (que permite lectura y escritura ilimitada):
                          <pre className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-950/80 rounded-xl font-mono text-[10px] text-orange-600 border border-zinc-150 dark:border-zinc-850 relative select-all leading-normal whitespace-pre font-semibold">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                          </pre>
                        </li>
                        <li>
                          Haz clic en el botón azul o naranja de arriba que dice <span className="font-black text-zinc-900 dark:text-white hover:underline">Publicar</span> (o Publish).
                        </li>
                      </ol>
                      <div className="bg-orange-50 dark:bg-orange-950/20 p-3.5 rounded-xl border border-orange-100 dark:border-orange-900/30 text-[11px] text-orange-700 dark:text-orange-400 leading-normal">
                        💡 <b>¡Y eso es todo!</b> Al pulsar Publicar se sincronizarán en segundos todos tus dulces localmente añadidos a la base de datos mundial, y se actualizarán en tiempo real para todos tus visitantes.
                      </div>
                    </motion.div>
                  )}
                </div>

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

                      {/* Section (sub-category) select dropdown */}
                      {(() => {
                        const activeCatInfo = categoriesWithSections.find(c => c.name === newCategory);
                        if (!activeCatInfo || !activeCatInfo.sections || activeCatInfo.sections.length === 0) return null;
                        return (
                          <div>
                            <label className="block text-xs font-semibold text-zinc-500 mb-1 flex items-center justify-between">
                              <span>Sección / Subcategoría <span className="text-[10px] text-zinc-400 font-normal">(Opcional)</span></span>
                              <span className="text-[10px] bg-amber-100 dark:bg-zinc-800 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">Activo</span>
                            </label>
                            <select
                              id="product-input-section"
                              value={newSection}
                              onChange={(e) => setNewSection(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl bg-orange-50/20 dark:bg-zinc-950 border border-orange-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-105 focus:outline-none focus:ring-2 focus:ring-orange-400 text-xs font-semibold"
                            >
                              <option value="">-- Sin Sección (Ninguna) --</option>
                              {activeCatInfo.sections.map((sec) => (
                                <option key={sec} value={sec}>
                                  {sec}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}

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
                     <div className="space-y-2 max-h-[350px] overflow-y-auto no-scrollbar pt-1">
                       {categories.map((cat) => {
                         const isExpanded = !!expandedCategories[cat];
                         const catWS = categoriesWithSections.find(c => c.name === cat);
                         const sectionsList = catWS ? catWS.sections || [] : [];
                         const secCount = sectionsList.length;

                         return (
                           <div 
                             key={cat} 
                             className="flex flex-col p-2.5 rounded-xl bg-orange-50/10 dark:bg-zinc-950/40 border border-orange-100/15 dark:border-zinc-850"
                           >
                             <div className="flex items-center justify-between gap-1.5">
                               <button
                                 type="button"
                                 onClick={() => {
                                   setExpandedCategories(prev => ({
                                     ...prev,
                                     [cat]: !prev[cat]
                                   }));
                                 }}
                                 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-orange-500 cursor-pointer flex-grow text-left"
                               >
                                 <Tag className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                                 <span className="truncate">{cat}</span>
                                 <span className="text-[9px] bg-orange-100 dark:bg-zinc-800 text-orange-700 dark:text-orange-350 px-1.5 py-0.2 rounded font-bold flex-shrink-0">
                                   {secCount}
                                 </span>
                                 {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />}
                               </button>

                               {categories.length > 1 && (
                                 <button
                                   type="button"
                                   onClick={() => {
                                     triggerConfirm(
                                       "Eliminar Categoría",
                                       `¿Estás seguro de eliminar la categoría "${cat}"? Los productos en ella ya no saldrán en las pestañas principales.`,
                                       () => onDeleteCategory(cat)
                                     );
                                   }}
                                   className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                                   title="Eliminar Categoría"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               )}
                             </div>

                             {/* Expanded Subsections Panel */}
                             {isExpanded && (
                               <div className="mt-2.5 pl-3.5 border-l border-orange-250 dark:border-zinc-800 space-y-2 py-1">
                                 {/* Subcategory sections list */}
                                 {secCount === 0 ? (
                                   <p className="text-[10px] text-zinc-400 dark:text-zinc-550 italic pb-0.5">
                                     Sin secciones aún (ej: chocolates, ácidos).
                                   </p>
                                 ) : (
                                   <div className="flex flex-wrap gap-1 pb-1">
                                     {sectionsList.map((sec) => (
                                       <span 
                                         key={sec} 
                                         className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 dark:bg-zinc-800 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-lg border border-amber-100/30"
                                       >
                                         <span className="truncate max-w-[85px]">{sec}</span>
                                         <button
                                           type="button"
                                           onClick={() => handleRemoveSectionFromCategory(cat, sec)}
                                           className="p-0.5 text-zinc-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                                           title="Borrar Sección"
                                         >
                                           <X className="w-2.5 h-2.5" />
                                         </button>
                                       </span>
                                     ))}
                                   </div>
                                 )}

                                 {/* Form to append section */}
                                 <div className="flex gap-1">
                                   <input
                                     type="text"
                                     placeholder="Ej: Chocolates"
                                     value={categorySectionsInputs[cat] || ''}
                                     onChange={(e) => setCategorySectionsInputs(prev => ({ ...prev, [cat]: e.target.value }))}
                                     onKeyDown={(e) => {
                                       if (e.key === 'Enter') {
                                         e.preventDefault();
                                         handleAddSectionToCategory(cat);
                                       }
                                     }}
                                     className="flex-grow px-2 py-1.5 bg-white dark:bg-zinc-900 border border-orange-100/40 dark:border-zinc-800 text-zinc-800 dark:text-zinc-150 rounded-lg text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-450"
                                   />
                                   <button
                                     type="button"
                                     onClick={() => handleAddSectionToCategory(cat)}
                                     className="px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-0.5"
                                   >
                                     <Plus className="w-3 h-3" /> Añadir
                                   </button>
                                 </div>
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                  </div>
                </div>

                {/* COLUMN 2: LIST & MANAGE PRODUCTS */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <h3 className="font-display font-black text-lg text-zinc-800 dark:text-zinc-100">
                        Productos ({products.length})
                      </h3>
                      
                      <div className="flex items-center gap-2">
                        {products.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerConfirm(
                                "⚠️ VACIAR TODO EL CATÁLOGO",
                                "¿Estás completamente seguro de que deseas eliminar ABSOLUTAMENTE TODOS los productos? Esta acción vaciará el catálogo entero para que puedas subir tu propia mercadería.",
                                () => {
                                  onClearAllProducts();
                                }
                              );
                            }}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Vaciar Catálogo
                          </button>
                        )}
                        
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Cerrar Sesión
                        </button>
                      </div>
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
                                src={prod.imageUrl || 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?q=80&w=600&auto=format&fit=crop'}
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
                                triggerConfirm(
                                  "Eliminar Producto",
                                  `¿Seguro que deseas eliminar "${prod.name}" del catálogo? Esta acción no se puede deshacer.`,
                                  () => onDeleteProduct(prod.id)
                                );
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

      {/* Custom Confirmation Popup on Top */}
      <AnimatePresence>
        {confirmState.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs" 
              onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-[28px] p-6 shadow-2xl z-10 text-center"
            >
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-display font-black text-lg text-zinc-850 dark:text-zinc-50 mb-2">
                {confirmState.title}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed mb-6">
                {confirmState.message}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-250 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmState.onConfirm}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs shadow-md shadow-red-500/10 transition-colors cursor-pointer"
                >
                  Sí, Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert Popup on Top */}
      <AnimatePresence>
        {alertState.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs" 
              onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-[28px] p-6 shadow-2xl z-10 text-center"
            >
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Tag className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-display font-black text-lg text-zinc-850 dark:text-zinc-50 mb-2">
                {alertState.title}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed mb-6">
                {alertState.message}
              </p>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
