import { useState, useEffect, useRef } from 'react'
import { TRANSLATIONS, LANGUAGES } from './translations'

const DEFAULT_STORES = [];
const PUBLIC_URL = "buy-list-mi-compra.netlify.app"; 

function App() {
  // --- ESTADOS ---
  const [language, setLanguage] = useState(() => localStorage.getItem('app-language') || null);
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    return saved === 'dark';
  });

  const [largeText, setLargeText] = useState(() => {
    const saved = localStorage.getItem('app-text-size');
    return saved === 'large';
  });

  const [listName, setListName] = useState(''); 
  
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('shopping-list');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedLists, setSavedLists] = useState(() => {
    const saved = localStorage.getItem('shopping-archives');
    return saved ? JSON.parse(saved) : [];
  });

  const [catalog, setCatalog] = useState(() => {
    const saved = localStorage.getItem('shopping-catalog');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [availableStores, setAvailableStores] = useState(() => {
    const saved = localStorage.getItem('shopping-stores');
    return saved ? JSON.parse(saved) : DEFAULT_STORES;
  });

  const [openStores, setOpenStores] = useState(() => []);
  const [history, setHistory] = useState([]); 
  const [future, setFuture] = useState([]);   
  
  const [newItem, setNewItem] = useState('');
  const [newStore, setNewStore] = useState(''); 
  
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  
  // Modales
  const [showArchives, setShowArchives] = useState(false);
  const [previewList, setPreviewList] = useState(null); 
  
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tutorial-completed'));
  const [tutorialStep, setTutorialStep] = useState(0);
  
  const [activeTab, setActiveTab] = useState('');
  const productInputRef = useRef(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', action: null });

  const t = language ? TRANSLATIONS[language] : TRANSLATIONS['es']; 

  // --- ORDENACIÓN ---
  const sortedAvailableStores = [...availableStores].sort((a, b) => a.localeCompare(b));
  const sortedOpenStores = [...openStores].sort((a, b) => a.localeCompare(b));
  const filteredCatalog = catalog.filter(item => item.toLowerCase().includes(newItem.toLowerCase())).sort();

  // --- EFECTOS DE PERSISTENCIA ---
  useEffect(() => { localStorage.setItem('shopping-list', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('shopping-archives', JSON.stringify(savedLists)); }, [savedLists]); 
  useEffect(() => { localStorage.setItem('shopping-catalog', JSON.stringify(catalog)); }, [catalog]);
  useEffect(() => { localStorage.setItem('shopping-stores', JSON.stringify(availableStores)); }, [availableStores]);
  
  useEffect(() => {
    if (language) localStorage.setItem('app-language', language);
  }, [language]);

  // Efecto IMPORTANTE para Modo Oscuro
  useEffect(() => {
    localStorage.setItem('app-theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('app-text-size', largeText ? 'large' : 'normal');
  }, [largeText]);

  useEffect(() => {
    const storesWithItems = [...new Set(items.map(i => i.store))];
    setOpenStores(prev => {
      const combined = new Set([...prev, ...storesWithItems]);
      return [...combined];
    });
  }, [items]);

  useEffect(() => {
    if (sortedOpenStores.length > 0 && !sortedOpenStores.includes(activeTab)) {
      setActiveTab(sortedOpenStores[0]);
    } else if (sortedOpenStores.length === 0) {
      setActiveTab('');
    }
  }, [openStores, activeTab]); 

  // --- GESTIÓN DE NAVEGACIÓN (BOTÓN ATRÁS) ---
  useEffect(() => {
    const handlePopState = (event) => {
      if (previewList) {
        setPreviewList(null);
        return;
      }
      if (showArchives) {
        setShowArchives(false);
        return;
      }
      if (language === null) {
        const stored = localStorage.getItem('app-language') || 'es';
        setLanguage(stored);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showArchives, previewList, language]);

  const openArchives = () => {
    window.history.pushState({ view: 'archives' }, '');
    setShowArchives(true);
  };

  const openLanguageSelector = () => {
    window.history.pushState({ view: 'language' }, '');
    setLanguage(null);
  };
  
  const openPreview = (list) => {
    window.history.pushState({ view: 'preview' }, '');
    setPreviewList(list);
  };

  // --- IMPORTAR URL ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('data');
    const sharedName = params.get('name');

    if (sharedData) {
      try {
        const parsedItems = JSON.parse(decodeURIComponent(sharedData));
        const finalName = sharedName ? decodeURIComponent(sharedName) : "Lista Compartida";
        setConfirmDialog({
          show: true,
          title: t.dialogImportTitle,
          message: `${t.dialogImportMsg} ("${finalName}")`,
          action: () => {
            setItems(parsedItems);
            setListName(finalName);
            setHistory([]);
            setFuture([]);
            showToast(t.toastSaved, "success");
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        });
      } catch (e) { showToast("Error", "error"); }
    }
  }, [language]);

  // --- HELPERS ---
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const closeDialog = () => setConfirmDialog({ ...confirmDialog, show: false });
  const confirmAction = () => { if (confirmDialog.action) confirmDialog.action(); closeDialog(); };

  const handleSelectLanguage = (langCode) => {
    window.history.replaceState(null, '', window.location.pathname);
    setLanguage(langCode);
  };

  // --- TUTORIAL ---
  const nextStep = () => {
    if (tutorialStep < t.tutorial.length - 1) setTutorialStep(tutorialStep + 1);
    else completeTutorial();
  };
  const prevStep = () => { if (tutorialStep > 0) setTutorialStep(tutorialStep - 1); };
  const completeTutorial = () => {
    localStorage.setItem('tutorial-completed', 'true');
    setShowTutorial(false);
  };

  // --- LÓGICA PRINCIPAL ---
  const handleListNameKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  };

  const saveToHistory = () => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(items))]);
    setFuture([]); 
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1]; 
    setFuture([JSON.parse(JSON.stringify(items)), ...future]); 
    setItems(prev); 
    setHistory(history.slice(0, -1)); 
    showToast(t.toastUndo, "info");
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0]; 
    setHistory([...history, JSON.parse(JSON.stringify(items))]); 
    setItems(next); 
    setFuture(future.slice(1)); 
    showToast(t.toastRedo, "info");
  };

  const updateQuantity = (id, delta) => {
    saveToHistory();
    setItems(items.map(i => i.id === id ? { ...i, quantity: Math.max(1, (i.quantity || 1) + delta) } : i));
  };

  const requestNewList = () => {
    if (items.length > 0) {
      setConfirmDialog({
        show: true, title: t.dialogNewTitle, message: t.dialogNewMsg,
        action: () => {
          setItems([]); setHistory([]); setFuture([]); setListName(""); setNewStore(''); setOpenStores([]); setShowArchives(false);
          showToast(t.toastEmpty, "success");
        }
      });
    } else {
      setListName(""); showToast(t.toastEmpty, "success");
    }
  };

  const handleSaveList = () => {
    if (items.length === 0) { showToast(t.toastEmpty, "error"); return; }
    const listToSave = {
      id: Date.now(), name: listName.trim() || t.placeholderName, date: new Date().toLocaleDateString(), items: items
    };
    setSavedLists([listToSave, ...savedLists]);
    showToast(t.toastSaved);
  };

  const requestLoadList = (archivedList) => {
    const load = () => {
      setItems(archivedList.items); setListName(archivedList.name); setHistory([]); setFuture([]); setShowArchives(false);
      if (previewList) setPreviewList(null);
      showToast(t.toastSaved, "success");
    };
    if (items.length > 0) {
      setConfirmDialog({ show: true, title: t.dialogLoadTitle, message: t.dialogLoadMsg, action: load });
    } else load();
  };

  const requestDeleteArchived = (id) => {
    setConfirmDialog({
      show: true, title: t.dialogDeleteFileTitle, message: t.dialogDeleteFileMsg,
      action: () => { setSavedLists(savedLists.filter(l => l.id !== id)); showToast(t.toastDeleted, "success"); }
    });
  };

  const shareList = () => {
    const pendingItems = items.filter(item => !item.done);
    if (pendingItems.length === 0) { showToast(t.toastEmpty, "error"); return; }
    
    const grouped = pendingItems.reduce((acc, item) => {
      if (!acc[item.store]) acc[item.store] = [];
      const qtyText = (item.quantity && item.quantity > 1) ? `(${item.quantity}) ` : '';
      acc[item.store].push(`${qtyText}${item.name}`);
      return acc;
    }, {});
    
    let message = `🛒 *${listName.toUpperCase() || t.appName}*\n\n`; 
    Object.keys(grouped).sort().forEach(store => {
      message += `🏪 *${store.toUpperCase()}*\n`;
      grouped[store].forEach(p => { message += `- ${p}\n`; });
      message += "\n";
    });

    const jsonItems = JSON.stringify(items);
    const baseUrl = (PUBLIC_URL && PUBLIC_URL !== "PON_AQUI_TU_ENLACE_DE_NETLIFY") ? PUBLIC_URL : window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?data=${encodeURIComponent(jsonItems)}&name=${encodeURIComponent(listName)}`;
    message += `\n📲 *App Link:*\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const openStoreTab = (storeName) => {
    if (!openStores.includes(storeName)) setOpenStores([...openStores, storeName]);
    setActiveTab(storeName);
  };

  const closeStoreTab = (e, storeName) => {
    e.stopPropagation(); 
    const hasItems = items.some(i => i.store === storeName);
    if (hasItems) saveToHistory();
    setOpenStores(openStores.filter(s => s !== storeName));
    setItems(items.filter(i => i.store !== storeName));
  };

  const requestDeleteStoreFromCatalog = (e, storeToDelete) => {
    e.stopPropagation(); 
    setConfirmDialog({
      show: true, title: t.deleteStoreTitle, message: `${t.deleteStoreMsg} ("${storeToDelete}")`,
      action: () => { 
        setAvailableStores(availableStores.filter(s => s !== storeToDelete)); 
        showToast(t.toastStoreDeleted, "success");
      }
    });
  };

  const requestDeleteProductFromCatalog = (e, productToDelete) => {
    e.stopPropagation(); 
    setConfirmDialog({
      show: true, title: t.deleteProductTitle, message: `${t.deleteProductMsg} ("${productToDelete}")`,
      action: () => { setCatalog(catalog.filter(p => p !== productToDelete)); showToast(t.toastDeleted, "success"); }
    });
  };

  const performAdd = (productName, storeNameInput) => {
    if (!productName.trim()) return;
    saveToHistory();
    const finalStoreName = storeNameInput.trim() === '' ? 'General' : storeNameInput.trim();
    const itemObj = { id: Date.now(), name: productName, store: finalStoreName, done: false, quantity: 1 };
    
    setItems(prev => [...prev, itemObj]); 
    if (!catalog.includes(productName)) setCatalog(prev => [...prev, productName]);
    
    const storeExists = availableStores.some(s => s.toLowerCase() === finalStoreName.toLowerCase());
    if (!storeExists) setAvailableStores(prev => [...prev, finalStoreName]);
    
    openStoreTab(finalStoreName);
    setNewItem(''); 
    setIsProductOpen(false); 
    if(productInputRef.current) productInputRef.current.focus();
    showToast(t.toastAdded);
  };

  const addItem = (e) => { e.preventDefault(); performAdd(newItem, newStore); };
  const handleSuggestionClick = (s) => { performAdd(s, newStore); };
  const handleProductKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); performAdd(newItem, newStore); } };

  const handleStoreKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newItem.trim()) {
        performAdd(newItem, newStore);
      } else {
        const storeName = newStore.trim();
        if (!storeName) return;
        const storeExists = availableStores.some(s => s.toLowerCase() === storeName.toLowerCase());
        if (!storeExists) setAvailableStores([...availableStores, storeName]);
        openStoreTab(storeName);
        setIsStoreOpen(false);
        e.target.blur();
        setNewStore(''); 
      }
    }
  };

  const toggleItem = (id) => {
    saveToHistory();
    setItems(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  };
  const deleteItem = (id) => {
    saveToHistory();
    setItems(items.filter(i => i.id !== id));
    showToast(t.toastDeleted, "info");
  };

  const currentTabItems = items.filter(i => i.store === activeTab).sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));

  // --- RENDERIZADO ---

  // PANTALLA 1: IDIOMA
  if (!language) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-700 flex flex-col items-center justify-center p-6">
        <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-500 border border-white/50">
          <div className="text-center mb-8">
            <span className="text-6xl mb-4 block filter drop-shadow-sm">🌍</span>
            <h1 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">Buy List</h1>
            <p className="text-gray-600 font-medium">Select your language</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LANGUAGES.map(lang => (
              <button key={lang.code} onClick={() => handleSelectLanguage(lang.code)}
                className="flex items-center gap-4 p-3 rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm hover:border-emerald-500 hover:bg-white transition-all group shadow-sm">
                <img src={lang.flagUrl} alt={lang.label} className="w-10 h-auto rounded-md shadow-sm group-hover:scale-110 transition-transform"/>
                <div><span className="block font-black text-gray-800 text-lg">{lang.label}</span></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA 2: TUTORIAL
  if (showTutorial) {
    const steps = t.tutorial; 
    const currentStepData = steps[tutorialStep];
    const bgColors = ["bg-emerald-500", "bg-indigo-500", "bg-orange-400", "bg-orange-500", "bg-blue-500", "bg-purple-500", "bg-green-600", "bg-emerald-600"];
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative flex flex-col min-h-[500px] transition-colors">
          <div className={`h-40 ${bgColors[tutorialStep] || "bg-gray-500"} flex items-center justify-center transition-colors duration-500`}>
            <span className="text-8xl animate-bounce filter drop-shadow-lg">{currentStepData.emoji}</span>
          </div>
          <div className="p-8 flex-1 flex flex-col justify-between text-center">
            <div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-4">{currentStepData.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">{currentStepData.desc}</p>
            </div>
            <div className="mt-8">
              <div className="flex justify-center gap-2 mb-6">
                {steps.map((_, idx) => (<div key={idx} className={`h-2 w-2 rounded-full transition-all duration-300 ${idx === tutorialStep ? 'bg-gray-800 dark:bg-white w-6' : 'bg-gray-300 dark:bg-gray-600'}`}></div>))}
              </div>
              <div className="flex gap-3 justify-center">
                {tutorialStep > 0 && (<button onClick={prevStep} className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition">{t.tutBack}</button>)}
                <button onClick={nextStep} className={`px-8 py-3 rounded-xl text-white font-bold shadow-lg transition transform active:scale-95 flex-1 ${bgColors[tutorialStep] || "bg-gray-800"}`}>{tutorialStep === steps.length - 1 ? t.tutStart : t.tutNext}</button>
              </div>
              {tutorialStep < steps.length - 1 && (<button onClick={completeTutorial} className="mt-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline">{t.tutSkip}</button>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA 3: ARCHIVOS / PREVIEW
  if (showArchives) {
    return (
      <div className={`app-container dark:bg-slate-900 ${largeText ? 'text-lg' : ''}`}>
        <div className="main-card relative dark:bg-slate-900 !min-h-screen">
          <div className="sticky-header-wrapper">
             <div className="p-6 bg-emerald-600 dark:bg-slate-800 text-white shadow-lg flex justify-between items-center md:rounded-t-3xl transition-colors">
               <h2 className="text-2xl font-bold">{t.archivesTitle}</h2>
               <button onClick={() => window.history.back()} className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition">{t.closeBtn}</button>
             </div>
          </div>
          
          <div className="p-4 space-y-4 flex-1 bg-gray-50 dark:bg-slate-900">
            {savedLists.length === 0 ? (
              <p className="text-center text-gray-400 mt-10">{t.emptyArchives}</p>
            ) : (
              savedLists.map(list => (
                <div key={list.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">{list.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">📅 {list.date} • {list.items.length} p.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openPreview(list)} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">👁️</button>
                    <button onClick={() => requestLoadList(list)} className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-lg text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-800 transition">{t.recoverBtn}</button>
                    <button onClick={() => requestDeleteArchived(list.id)} className="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-300 px-3 py-1 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition">🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>
          {previewList && (
             <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-900 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 bg-blue-600 dark:bg-blue-800 text-white shadow-md flex justify-between items-center sticky top-0">
                   <h3 className="font-bold text-lg">{t.previewTitle}</h3>
                   <button onClick={() => window.history.back()} className="text-white bg-white/20 px-3 py-1 rounded-lg text-sm">{t.closeBtn}</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                   <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">{previewList.name}</h2>
                   <p className="text-sm text-gray-500 mb-4">{previewList.items.length} {t.totalItems}</p>
                   <ul className="space-y-2 pb-20">
                      {previewList.items.map((item, idx) => (
                         <li key={idx} className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                            <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                            <span className="text-gray-400 text-sm">x{item.quantity || 1}</span>
                         </li>
                      ))}
                   </ul>
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0">
                    <button onClick={() => requestLoadList(previewList)} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg">{t.recoverBtn}</button>
                </div>
             </div>
          )}
        </div>
        {confirmDialog.show && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl">
                 <h3 className="font-bold text-lg mb-2 dark:text-white">{confirmDialog.title}</h3>
                 <p className="mb-4 dark:text-gray-300">{confirmDialog.message}</p>
                 <div className="flex justify-end gap-2">
                     <button onClick={closeDialog} className="px-4 py-2 text-gray-500">{t.cancelBtn}</button>
                     <button onClick={confirmAction} className="px-4 py-2 bg-red-500 text-white rounded-lg">{t.confirmBtn}</button>
                 </div>
             </div>
           </div>
        )}
      </div>
    );
  }

  // --- APP PRINCIPAL ---
  return (
    <div className={`app-container ${largeText ? 'text-lg' : ''}`}>
      <div className="main-card">
        
        {/* HEADER */}
        <div className="header-section">
            <div className="flex flex-col md:flex-row justify-center items-center gap-3 mb-6 relative">
                <div className="flex items-center gap-2">
                  <span className="text-4xl filter drop-shadow-md">🛒</span>
                  <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md italic">{t.appName}</h1>
                </div>
                <div className="mt-2 md:mt-0 md:absolute md:right-0 md:top-1/2 md:transform md:-translate-y-1/2 flex gap-2">
                  <button onClick={() => setLargeText(!largeText)} className="bg-white/20 hover:bg-white/30 border border-white/10 rounded-full w-10 h-10 flex items-center justify-center transition-all hover:scale-105 shadow-sm backdrop-blur-md">
                    <span className="text-lg font-bold">Aa</span>
                  </button>
                  <button onClick={() => setDarkMode(!darkMode)} className="bg-white/20 hover:bg-white/30 border border-white/10 rounded-full w-10 h-10 flex items-center justify-center transition-all hover:scale-105 shadow-sm backdrop-blur-md">
                    <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
                  </button>
                  <button onClick={openLanguageSelector} className="bg-white/20 hover:bg-white/30 border border-white/10 rounded-full w-10 h-10 flex items-center justify-center transition-all hover:scale-105 shadow-sm backdrop-blur-md overflow-hidden">
                    <img src={LANGUAGES.find(l => l.code === language)?.flagUrl} alt="Language" className="w-full h-full object-cover opacity-90 hover:opacity-100"/>
                  </button>
                </div>
            </div>

            <div className="flex flex-col gap-3 mb-4 border-b border-white/20 pb-4">
              <div className="flex justify-between items-center gap-3">
                 <input type="text" value={listName} onChange={(e) => setListName(e.target.value)} onKeyDown={handleListNameKeyDown} enterKeyHint="done" className="input-field bg-white/20 text-white font-bold text-xl focus:outline-none focus:bg-white/30 rounded-lg px-3 py-2 w-full placeholder-white/60 border border-white/10" placeholder={t.placeholderName}/>
                 <button onClick={openArchives} className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 h-11 rounded-lg flex items-center gap-1 transition border border-white/10 whitespace-nowrap">{t.savedListsBtn}</button>
              </div>
              <div className="flex gap-2 justify-end">
                 <button onClick={requestNewList} className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition border border-white/10">{t.newListBtn}</button>
                 <button onClick={handleSaveList} className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition border border-white/10">{t.saveBtn}</button>
              </div>
            </div>

            <div className="mb-6 flex justify-center">
                <button onClick={shareList} className="w-full bg-white dark:bg-slate-800 dark:text-green-400 text-[#25D366] hover:bg-green-50 dark:hover:bg-slate-700 font-bold text-sm px-4 py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>
                  <span className="text-base text-gray-700 dark:text-green-400">{t.shareBtn}</span>
                </button>
            </div>

            <form onSubmit={addItem} className="flex flex-col gap-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative group">
                  <label className="block text-xs font-bold text-emerald-100 mb-1 ml-1 uppercase tracking-wide">{t.productLabel}</label>
                  <input ref={productInputRef} type="text" placeholder={t.addProductPlaceholder} className="input-field" value={newItem} onChange={(e) => { setNewItem(e.target.value); setIsProductOpen(true); }} onKeyDown={handleProductKeyDown} onFocus={() => setIsProductOpen(true)} enterKeyHint="go"/>
                  {isProductOpen && filteredCatalog.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsProductOpen(false)}></div>
                      <ul className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20 text-gray-700 dark:text-gray-200 py-2 animate-in fade-in zoom-in-95 duration-200">
                        {filteredCatalog.map((suggestion, index) => (
                          <li key={index} className="px-4 py-2 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-700 dark:hover:text-orange-400 cursor-pointer text-sm flex justify-between items-center transition-colors border-b border-gray-50 dark:border-slate-700 last:border-0 group" onClick={() => handleSuggestionClick(suggestion)}>
                            <span className="font-medium flex-1">{suggestion}</span>
                            <div className="flex items-center gap-2">
                               <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-600 dark:text-gray-300 px-2 py-1 rounded-full group-hover:bg-orange-100 group-hover:text-orange-600">{t.addLabel}</span>
                               <button onClick={(e) => requestDeleteProductFromCatalog(e, suggestion)} className="p-1.5 rounded-full text-gray-300 hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">x</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div className="w-5/12 relative group">
                  <label className="block text-xs font-bold text-emerald-100 mb-1 ml-1 uppercase tracking-wide truncate">{t.storeLabel}</label>
                  <div className="flex relative h-full">
                    <input type="text" placeholder={t.storePlaceholder} className="input-field pr-8" value={newStore} onKeyDown={handleStoreKeyDown} onChange={(e) => { setNewStore(e.target.value); setIsStoreOpen(true); }} onFocus={() => setIsStoreOpen(true)} enterKeyHint="go"/>
                    <button type="button" onClick={() => setIsStoreOpen(!isStoreOpen)} className="absolute right-0 top-0 h-full px-3 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                  {isStoreOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsStoreOpen(false)}></div>
                      <ul className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20 text-gray-700 dark:text-gray-200 py-2 animate-in fade-in zoom-in-95 duration-200">
                        <li className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-700 border-b border-gray-100 dark:border-slate-600 cursor-default sticky top-0 z-10">{t.storeSelectTitle}</li>
                        {sortedAvailableStores.map((store, index) => (
                          <li key={index} className="px-4 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer text-sm flex justify-between items-center transition-colors group" onClick={() => { setNewStore(store); openStoreTab(store); setIsStoreOpen(false); if(productInputRef.current) productInputRef.current.focus(); }}>
                            <span className="flex-1">{store}</span>
                            <button onClick={(e) => requestDeleteStoreFromCatalog(e, store)} className="p-1.5 rounded-full text-gray-300 hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">x</button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
              <button type="submit" className="btn-add"><span>➕</span> {t.addBtn}</button>
            </form>

            <div className="flex justify-center mt-4">
               <div className="flex bg-black/20 rounded-full p-1 backdrop-blur-md">
                  <button onClick={handleUndo} disabled={history.length === 0} className={`px-3 py-1 text-xs rounded-l-full flex items-center gap-1 transition-colors ${history.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 text-white cursor-pointer'}`}><span>↩</span> {t.backBtn}</button>
                  <div className="w-px bg-white/20 mx-1"></div>
                  <button onClick={handleRedo} disabled={future.length === 0} className={`px-3 py-1 text-xs rounded-r-full flex items-center gap-1 transition-colors ${future.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 text-white cursor-pointer'}`}>{t.nextBtn} <span>↪</span></button>
               </div>
            </div>
        </div>
        
        <div className="flex overflow-x-auto bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700 scrollbar-hide p-2 gap-2 backdrop-blur-sm">
          {sortedOpenStores.length === 0 ? (
            <div className="p-4 text-gray-400 text-sm italic w-full text-center flex items-center justify-center gap-2"><span>👆</span> {t.selectStore}</div>
          ) : (
            sortedOpenStores.map(store => (
              <div key={store} onClick={() => setActiveTab(store)} className={`tab-base group ${activeTab === store ? 'tab-active' : 'tab-inactive'}`}>
                {store}
                <button onClick={(e) => closeStoreTab(e, store)} className={`w-5 h-5 flex items-center justify-center rounded-full transition opacity-50 group-hover:opacity-100 ${activeTab === store ? 'hover:bg-red-100 text-red-400' : 'hover:bg-gray-200 text-gray-400 dark:hover:bg-slate-600'}`}>x</button>
              </div>
            ))
          )}
        </div>

        <div className="flex-1 relative bg-white/50 dark:bg-slate-900 z-0 p-2 min-h-[300px]">
          {!activeTab ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 dark:text-slate-700 space-y-4">
                <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl shadow-inner">🧾</div>
                <p>{t.emptyList}</p>
             </div>
          ) : (
            <>
              {currentTabItems.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                    <span className="text-4xl mb-2 opacity-50">🛒</span>
                    <p className="text-sm font-medium">{t.emptyList} <span className="text-emerald-600 dark:text-emerald-400">{activeTab}</span></p>
                 </div>
              ) : (
                <ul className="space-y-2 pb-20"> 
                  {currentTabItems.map(item => (
                    <li key={item.id} className="list-item-container group dark:bg-slate-800 dark:border-slate-700 dark:shadow-none">
                      <div className="flex flex-col items-center mr-3 space-y-1">
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold hover:bg-emerald-100 transition">＋</button>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">x{item.quantity || 1}</span>
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-400 flex items-center justify-center text-xs font-bold hover:bg-red-100 hover:text-red-500 transition">－</button>
                      </div>
                      <div onClick={() => toggleItem(item.id)} className="flex items-center cursor-pointer flex-1 select-none">
                        <div className={`checkbox-circle ${item.done ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-sm' : 'border-gray-300 dark:border-slate-500 bg-gray-50 dark:bg-slate-900 group-hover:border-emerald-400'}`}>
                          {item.done && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className={`text-lg font-medium transition-all duration-300 ml-3 ${item.done ? 'line-through text-gray-400 dark:text-gray-600 decoration-emerald-500/50 decoration-2' : 'text-gray-200 dark:text-white'}`}>{item.name}</span>
                      </div>
                      <button onClick={() => deleteItem(item.id)} className="p-2 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

      </div>
      
      {confirmDialog.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100 dark:bg-slate-800">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={closeDialog} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700 rounded-lg transition">{t.cancelBtn}</button>
              <button onClick={confirmAction} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium shadow-lg shadow-red-200">{t.confirmBtn}</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[110] px-6 py-3 rounded-full shadow-2xl text-white font-medium flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 ${toast.type === 'error' ? 'bg-rose-500' : toast.type === 'info' ? 'bg-gray-800' : 'bg-emerald-600'}`}>
          <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '🚫' : 'ℹ️'}</span>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App