import { useState, useEffect, useRef } from 'react'

const DEFAULT_STORES = [];

function App() {
  // --- ESTADOS ---
  const [listName, setListName] = useState();
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
  const [showArchives, setShowArchives] = useState(false); 
  
  const [activeTab, setActiveTab] = useState('');
  const productInputRef = useRef(null);

  // Estados UI
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ 
    show: false, 
    title: '', 
    message: '', 
    action: null 
  });

  // --- ORDENACIÓN ---
  const sortedAvailableStores = [...availableStores].sort((a, b) => a.localeCompare(b));
  const sortedOpenStores = [...openStores].sort((a, b) => a.localeCompare(b));
  
  const filteredCatalog = catalog.filter(item => 
    item.toLowerCase().includes(newItem.toLowerCase())
  ).sort();

  // --- EFECTOS ---
  useEffect(() => { localStorage.setItem('shopping-list', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('shopping-archives', JSON.stringify(savedLists)); }, [savedLists]); 
  useEffect(() => { localStorage.setItem('shopping-catalog', JSON.stringify(catalog)); }, [catalog]);
  useEffect(() => { localStorage.setItem('shopping-stores', JSON.stringify(availableStores)); }, [availableStores]);

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

  // --- IMPORTAR URL (Deep Linking) ---
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
          title: "📥 Lista Recibida",
          message: `Has recibido la lista "${finalName}". ¿Quieres cargarla? (Sustituirá la actual).`,
          action: () => {
            setItems(parsedItems);
            setListName(finalName);
            setHistory([]);
            setFuture([]);
            showToast("Lista importada con éxito", "success");
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        });
      } catch (e) {
        showToast("Error al leer la lista compartida", "error");
      }
    }
  }, []);

  // --- HELPERS UI ---
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const closeDialog = () => {
    setConfirmDialog({ ...confirmDialog, show: false });
  };

  const confirmAction = () => {
    if (confirmDialog.action) confirmDialog.action();
    closeDialog();
  };

  // --- LÓGICA DE NEGOCIO ---

  const saveToHistory = () => {
    const currentItemsCopy = JSON.parse(JSON.stringify(items));
    setHistory(prev => [...prev, currentItemsCopy]);
    setFuture([]); 
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1]; 
    const currentState = JSON.parse(JSON.stringify(items));
    setFuture([currentState, ...future]); 
    setItems(previousState); 
    setHistory(history.slice(0, -1)); 
    showToast("Deshacer realizado", "info");
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const nextState = future[0]; 
    const currentState = JSON.parse(JSON.stringify(items));
    setHistory([...history, currentState]); 
    setItems(nextState); 
    setFuture(future.slice(1)); 
    showToast("Rehacer realizado", "info");
  };

  const requestNewList = () => {
    if (items.length > 0) {
      setConfirmDialog({
        show: true,
        title: "Nueva Lista",
        message: "¿Seguro que quieres borrar la lista actual y empezar una nueva? Asegúrate de haber guardado.",
        action: () => {
          setItems([]);
          setHistory([]);
          setFuture([]);
          setListName("");
          setNewStore(''); 
          setOpenStores([]);
          setShowArchives(false);
          showToast("¡Lista nueva creada!", "success");
        }
      });
    } else {
      setListName("");
      showToast("Lista nueva lista", "success");
    }
  };

  const handleSaveList = () => {
    if (items.length === 0) {
      showToast("La lista está vacía, añade algo antes.", "error");
      return;
    }
    const nameToSave = listName.trim() || "Lista sin nombre";
    const listToSave = {
      id: Date.now(),
      name: nameToSave,
      date: new Date().toLocaleDateString(),
      items: items
    };
    setSavedLists([listToSave, ...savedLists]);
    showToast(`Lista "${nameToSave}" guardada correctamente.`);
  };

  const requestLoadList = (archivedList) => {
    const load = () => {
      setItems(archivedList.items);
      setListName(archivedList.name);
      setHistory([]); 
      setFuture([]);
      setShowArchives(false); 
      showToast("Lista cargada", "success");
    };

    if (items.length > 0) {
      setConfirmDialog({
        show: true,
        title: "Cargar Lista",
        message: `¿Cargar la lista "${archivedList.name}"? Esto reemplazará lo que tienes en pantalla.`,
        action: load
      });
    } else {
      load();
    }
  };

  const requestDeleteArchived = (id) => {
    setConfirmDialog({
      show: true,
      title: "Eliminar Archivo",
      message: "¿Eliminar esta lista guardada para siempre?",
      action: () => {
        setSavedLists(savedLists.filter(l => l.id !== id));
        showToast("Lista eliminada de archivos", "success");
      }
    });
  };

  const shareList = () => {
    const pendingItems = items.filter(item => !item.done);
    if (pendingItems.length === 0) { showToast("¡Nada pendiente para compartir!", "error"); return; }
    
    const grouped = pendingItems.reduce((acc, item) => {
      if (!acc[item.store]) acc[item.store] = [];
      acc[item.store].push(item.name);
      return acc;
    }, {});
    
    let message = `🛒 *${listName.toUpperCase() || "MI COMPRA"}*\n\n`; 
    Object.keys(grouped).sort().forEach(store => {
      message += `🏪 *${store.toUpperCase()}*\n`;
      grouped[store].forEach(product => { message += `- ${product}\n`; });
      message += "\n";
    });

    const jsonItems = JSON.stringify(items);
    const appUrl = window.location.origin + window.location.pathname; 
    const shareUrl = `${appUrl}?data=${encodeURIComponent(jsonItems)}&name=${encodeURIComponent(listName)}`;

    message += `\n📲 *Abre la lista en la App aquí:*\n${shareUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const openStoreTab = (storeName) => {
    if (!openStores.includes(storeName)) { setOpenStores([...openStores, storeName]); }
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
      show: true,
      title: "Eliminar Tienda",
      message: `¿Eliminar "${storeToDelete}" de tus tiendas guardadas?`,
      action: () => {
        setAvailableStores(availableStores.filter(s => s !== storeToDelete));
        showToast("Tienda eliminada", "success");
      }
    });
  };

  const requestDeleteProductFromCatalog = (e, productToDelete) => {
    e.stopPropagation(); 
    setConfirmDialog({
      show: true,
      title: "Eliminar Producto",
      message: `¿Eliminar "${productToDelete}" de tus sugerencias frecuentes?`,
      action: () => {
        setCatalog(catalog.filter(p => p !== productToDelete));
        showToast("Producto eliminado del historial", "success");
      }
    });
  };

  const performAdd = (productName, storeNameInput) => {
    if (!productName.trim()) return;
    
    saveToHistory();
    
    const finalStoreName = storeNameInput.trim() === '' ? 'General' : storeNameInput.trim();
    const itemObj = { id: Date.now(), name: productName, store: finalStoreName, done: false };
    setItems(prev => [...prev, itemObj]); 
    
    if (!catalog.includes(productName)) setCatalog(prev => [...prev, productName]);
    
    const storeClean = finalStoreName;
    const storeExists = availableStores.some(s => s.toLowerCase() === storeClean.toLowerCase());
    if (!storeExists) setAvailableStores(prev => [...prev, storeClean]);
    
    openStoreTab(finalStoreName);
    setNewItem(''); 
    setIsProductOpen(false); 
    
    if(productInputRef.current) productInputRef.current.focus();
    showToast("Producto añadido");
  };

  const addItem = (e) => {
    e.preventDefault();
    performAdd(newItem, newStore);
  };

  const handleSuggestionClick = (suggestion) => {
    performAdd(suggestion, newStore);
  };

  const handleProductKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performAdd(newItem, newStore);
    }
  };

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
        if(productInputRef.current) productInputRef.current.focus();
      }
    }
  };

  const toggleItem = (id) => {
    saveToHistory();
    setItems(items.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const deleteItem = (id) => {
    saveToHistory();
    setItems(items.filter(item => item.id !== id));
    showToast("Producto borrado de la lista", "info");
  };

  const currentTabItems = items.filter(item => item.store === activeTab);

  // --- VISTA DE ARCHIVOS (MODAL) ---
  if (showArchives) {
    return (
      <div className="app-container">
        <div className="main-card relative">
          <div className="p-6 bg-emerald-600 text-white shadow-lg sticky top-0 z-30">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">📂 Mis Listas</h2>
              <button onClick={() => setShowArchives(false)} className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition">
                ✕ Cerrar
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-4 overflow-y-auto bg-gray-50 h-full pb-20">
            {savedLists.length === 0 ? (
              <p className="text-center text-gray-400 mt-10">No tienes listas guardadas aún.</p>
            ) : (
              savedLists.map(list => (
                <div key={list.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{list.name}</h3>
                    <p className="text-xs text-gray-500">📅 {list.date} • {list.items.length} productos</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => requestLoadList(list)} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-emerald-200 transition">
                      Recuperar
                    </button>
                    <button onClick={() => requestDeleteArchived(list.id)} className="bg-red-50 text-red-500 px-3 py-1 rounded-lg text-sm hover:bg-red-100 transition">
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* COMPONENTES FLOTANTES */}
        {confirmDialog.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{confirmDialog.title}</h3>
              <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
              <div className="flex justify-end gap-3">
                <button onClick={closeDialog} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                <button onClick={confirmAction} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium shadow-lg shadow-red-200">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA PRINCIPAL ---
  return (
    <div className="app-container">
      <div className="main-card">
        
        {/* HEADER */}
        <div className="header-section">
          
          {/* BARRA SUPERIOR */}
          <div className="flex flex-col gap-3 mb-4 border-b border-white/20 pb-4">
            <div className="flex justify-between items-center gap-3">
               <input 
                 type="text" 
                 value={listName} 
                 onChange={(e) => setListName(e.target.value)}
                 className="bg-white/20 text-white font-bold text-xl focus:outline-none focus:bg-white/30 rounded-lg px-3 py-2 w-full placeholder-white/60 border border-white/10"
                 placeholder="Pon nombre a tu lista"
               />
               
               <button 
                  onClick={() => setShowArchives(true)} 
                  className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 h-11 rounded-lg flex items-center gap-1 transition border border-white/10 whitespace-nowrap"
                  title="Ver listas guardadas"
               >
                 📂 Listas guardadas
               </button>
            </div>
            
            <div className="flex gap-2 justify-end">
               <button onClick={requestNewList} className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition border border-white/10">
                 ✨ Nueva
               </button>
               <button onClick={handleSaveList} className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition border border-white/10">
                 💾 Guardar
               </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl filter drop-shadow-md">🛒</span>
              <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md italic">Buy List</h1>
              
              {/* CAMBIO: BOTÓN WHATSAPP GRANDE CON TEXTO */}
              <button 
                onClick={shareList} 
                className="ml-3 bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                title="Compartir por WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.664-.698c.983.565 1.761.792 2.796.793 3.18 0 5.768-2.587 5.768-5.767s-2.588-5.767-5.768-5.767zm0 9.873c-.863 0-1.57-.22-2.316-.622l-1.371.36.368-1.325c-.456-.757-.665-1.391-.664-2.52 0-2.264 1.842-4.106 4.105-4.106 2.265 0 4.107 1.842 4.107 4.106 0 2.264-1.842 4.107-4.106 4.107z"/>
                </svg>
                <span>Enviar lista</span>
              </button>
            </div>
            
            {/* UNDO / REDO */}
            <div className="flex bg-black/20 rounded-full p-1 backdrop-blur-md">
              <button onClick={handleUndo} disabled={history.length === 0}
                className={`px-3 py-1 text-xs rounded-l-full flex items-center gap-1 transition-colors ${history.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 text-white cursor-pointer'}`}>
                <span>↩</span> Atrás
              </button>
              <div className="w-px bg-white/20 mx-1"></div>
              <button onClick={handleRedo} disabled={future.length === 0}
                className={`px-3 py-1 text-xs rounded-r-full flex items-center gap-1 transition-colors ${future.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 text-white cursor-pointer'}`}>
                Adelante <span>↪</span>
              </button>
            </div>
          </div>

          <form onSubmit={addItem} className="flex flex-col gap-3">
            <div className="flex gap-2 items-end">
              
              {/* BLOQUE PRODUCTO */}
              <div className="flex-1 relative group">
                <label className="block text-xs font-bold text-emerald-100 mb-1 ml-1 uppercase tracking-wide">
                  Elige tus productos
                </label>
                <input 
                  ref={productInputRef} 
                  type="text" 
                  placeholder="¿Qué te apetece hoy?" 
                  className="input-field"
                  value={newItem} 
                  onChange={(e) => { setNewItem(e.target.value); setIsProductOpen(true); }} 
                  onKeyDown={handleProductKeyDown}
                  onFocus={() => setIsProductOpen(true)}
                  enterKeyHint="go"
                />
                
                {isProductOpen && filteredCatalog.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsProductOpen(false)}></div>
                    <ul className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20 text-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200">
                      {filteredCatalog.map((suggestion, index) => (
                        <li 
                          key={index} 
                          className="px-4 py-2 hover:bg-orange-50 hover:text-orange-700 cursor-pointer text-sm flex justify-between items-center transition-colors border-b border-gray-50 last:border-0 group"
                          onClick={() => handleSuggestionClick(suggestion)} 
                        >
                          <span className="font-medium flex-1">{suggestion}</span>
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full group-hover:bg-orange-100 group-hover:text-orange-600">Añadir</span>
                             <button 
                               onClick={(e) => requestDeleteProductFromCatalog(e, suggestion)}
                               className="p-1.5 rounded-full text-gray-300 hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                               title="Eliminar producto"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                 <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                               </svg>
                             </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* BLOQUE TIENDA */}
              <div className="w-1/3 relative group">
                <label className="block text-xs font-bold text-emerald-100 mb-1 ml-1 uppercase tracking-wide truncate">
                  Tienda o Súper
                </label>
                <div className="flex relative h-full">
                  <input 
                    type="text" 
                    placeholder="Escribe..." 
                    className="input-field pr-8"
                    value={newStore} 
                    onKeyDown={handleStoreKeyDown} 
                    onChange={(e) => { setNewStore(e.target.value); setIsStoreOpen(true); }} 
                    onFocus={() => setIsStoreOpen(true)} 
                    enterKeyHint="go"
                  />
                  <button type="button" onClick={() => setIsStoreOpen(!isStoreOpen)} className="absolute right-0 top-0 h-full px-3 text-emerald-600 hover:text-emerald-800 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>

                {isStoreOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsStoreOpen(false)}></div>
                    <ul className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20 text-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200">
                      
                      <li className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 cursor-default sticky top-0 z-10">
                        Elige tienda o supermercado
                      </li>

                      {sortedAvailableStores.map((store, index) => (
                        <li key={index} className="px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer text-sm flex justify-between items-center transition-colors group"
                          onClick={() => { setNewStore(store); openStoreTab(store); setIsStoreOpen(false); if(productInputRef.current) productInputRef.current.focus(); }}>
                          
                          <span className="flex-1">{store}</span>
                          
                          <button 
                            onClick={(e) => requestDeleteStoreFromCatalog(e, store)}
                            className="p-1.5 rounded-full text-gray-300 hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            title="Eliminar tienda"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>

                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
            
            <button type="submit" className="btn-add">
              <span>➕</span> Añadir a la cesta
            </button>
          </form>
        </div>

        {/* TABS */}
        <div className="flex overflow-x-auto bg-gray-50/50 border-b border-gray-100 scrollbar-hide p-2 gap-2">
          {sortedOpenStores.length === 0 ? (
            <div className="p-4 text-gray-400 text-sm italic w-full text-center flex items-center justify-center gap-2"><span>👆</span> Selecciona un súper arriba</div>
          ) : (
            sortedOpenStores.map(store => (
              <div key={store} onClick={() => setActiveTab(store)}
                className={`tab-base group ${activeTab === store ? 'tab-active' : 'tab-inactive'}`}>
                {store}
                <button onClick={(e) => closeStoreTab(e, store)} className={`w-5 h-5 flex items-center justify-center rounded-full transition opacity-50 group-hover:opacity-100 ${activeTab === store ? 'hover:bg-red-100 text-red-400' : 'hover:bg-gray-200 text-gray-400'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto relative bg-white/50 z-0">
          {!activeTab ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 space-y-4">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-4xl shadow-inner">🧾</div>
                <p>Tu lista está vacía</p>
             </div>
          ) : (
            <>
              {currentTabItems.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <span className="text-4xl mb-2 opacity-50">🛒</span>
                    <p className="text-sm font-medium">Lista vacía para <span className="text-emerald-600">{activeTab}</span></p>
                 </div>
              ) : (
                <ul className="pb-20 p-2 space-y-2"> 
                  {currentTabItems.map(item => (
                    <li key={item.id} className="list-item-container group">
                      <div onClick={() => toggleItem(item.id)} className="flex items-center cursor-pointer flex-1 select-none">
                        <div className={`checkbox-circle ${item.done ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-sm' : 'border-gray-300 bg-gray-50 group-hover:border-emerald-400'}`}>
                          {item.done && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className={`text-lg font-medium transition-all duration-300 ${item.done ? 'line-through text-gray-400 decoration-emerald-500/50 decoration-2' : 'text-gray-700'}`}>{item.name}</span>
                      </div>
                      <button onClick={() => deleteItem(item.id)} className="p-2 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

      </div>

      {/* COMPONENTES FLOTANTES (UI) */}
      
      {/* DIALOG DE CONFIRMACIÓN */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{confirmDialog.title}</h3>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={closeDialog} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition font-medium">Cancelar</button>
              <button onClick={confirmAction} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition font-medium shadow-md">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl text-white font-medium flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 ${toast.type === 'error' ? 'bg-rose-500' : toast.type === 'info' ? 'bg-gray-800' : 'bg-emerald-600'}`}>
          <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '🚫' : 'ℹ️'}</span>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App