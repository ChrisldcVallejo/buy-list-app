import { useState, useEffect, useRef } from 'react'

const DEFAULT_STORES = [
  "Ahorramás", "Aldi", "Carrefour", "Día", 
  "Hiper Usera", "Hipercor", "Lidl", "Mercadona"
];

function App() {
  // --- ESTADOS ---
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('shopping-list');
    return saved ? JSON.parse(saved) : [];
  });
  const [openStores, setOpenStores] = useState(() => {
    const savedItems = localStorage.getItem('shopping-list');
    const parsedItems = savedItems ? JSON.parse(savedItems) : [];
    return [...new Set(parsedItems.map(i => i.store))];
  });
  const [catalog, setCatalog] = useState(() => {
    const saved = localStorage.getItem('shopping-catalog');
    return saved ? JSON.parse(saved) : [];
  });
  const [availableStores, setAvailableStores] = useState(() => {
    const saved = localStorage.getItem('shopping-stores');
    return saved ? JSON.parse(saved) : DEFAULT_STORES;
  });
  
  const [history, setHistory] = useState([]); 
  const [future, setFuture] = useState([]);   
  
  const [newItem, setNewItem] = useState('');
  const [newStore, setNewStore] = useState('Mercadona');
  
  // Control de desplegables
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState('');
  const productInputRef = useRef(null);

  // Ordenaciones y Filtros
  const sortedAvailableStores = [...availableStores].sort((a, b) => a.localeCompare(b));
  const sortedOpenStores = [...openStores].sort((a, b) => a.localeCompare(b));
  
  const filteredCatalog = catalog.filter(item => 
    item.toLowerCase().includes(newItem.toLowerCase())
  ).sort();

  // --- EFECTOS ---
  useEffect(() => { localStorage.setItem('shopping-list', JSON.stringify(items)); }, [items]);
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
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const nextState = future[0]; 
    const currentState = JSON.parse(JSON.stringify(items));
    setHistory([...history, currentState]); 
    setItems(nextState); 
    setFuture(future.slice(1)); 
  };

  const shareList = () => {
    const pendingItems = items.filter(item => !item.done);
    if (pendingItems.length === 0) { alert("¡Nada pendiente!"); return; }
    const grouped = pendingItems.reduce((acc, item) => {
      if (!acc[item.store]) acc[item.store] = [];
      acc[item.store].push(item.name);
      return acc;
    }, {});
    let message = "🍎 *MI COMPRA FRESCA* 🥦\n\n";
    Object.keys(grouped).sort().forEach(store => {
      message += `🏪 *${store.toUpperCase()}*\n`;
      grouped[store].forEach(product => { message += `- ${product}\n`; });
      message += "\n";
    });
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

  const deleteStoreFromCatalog = (e, storeToDelete) => {
    e.stopPropagation(); 
    if (confirm(`¿Eliminar "${storeToDelete}" de la lista de tiendas guardadas?`)) {
      setAvailableStores(availableStores.filter(s => s !== storeToDelete));
    }
  };

  // --- FUNCIÓN CENTRALIZADA PARA AÑADIR ---
  const performAdd = (productName, storeName) => {
    if (!productName.trim()) return;
    
    saveToHistory();
    
    const itemObj = { id: Date.now(), name: productName, store: storeName, done: false };
    setItems(prev => [...prev, itemObj]); 
    
    if (!catalog.includes(productName)) setCatalog(prev => [...prev, productName]);
    
    const storeClean = storeName.trim();
    const storeExists = availableStores.some(s => s.toLowerCase() === storeClean.toLowerCase());
    if (!storeExists) setAvailableStores(prev => [...prev, storeClean]);
    
    openStoreTab(storeName);
    setNewItem(''); 
    setIsProductOpen(false); 
    
    // Mantener el foco en el producto para seguir añadiendo rápido
    if(productInputRef.current) productInputRef.current.focus();
  };

  const addItem = (e) => {
    e.preventDefault();
    performAdd(newItem, newStore);
  };

  const handleSuggestionClick = (suggestion) => {
    performAdd(suggestion, newStore);
  };

  // --- NUEVO: Manejo explícito de Enter en el Producto ---
  const handleProductKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evita el submit doble
      performAdd(newItem, newStore);
    }
  };

  // --- MODIFICADO: Manejo explícito de Enter en la Tienda ---
  const handleStoreKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Controlamos nosotros la acción

      if (newItem.trim()) {
        // CASO 1: Si hay producto escrito, AÑADIR TODO
        performAdd(newItem, newStore);
      } else {
        // CASO 2: Si NO hay producto, solo abrir pestaña
        const storeName = newStore.trim();
        if (!storeName) return;
        
        const storeExists = availableStores.some(s => s.toLowerCase() === storeName.toLowerCase());
        if (!storeExists) setAvailableStores([...availableStores, storeName]);
        openStoreTab(storeName);
        setIsStoreOpen(false);
        // Volver el foco al producto
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
  };

  const currentTabItems = items.filter(item => item.store === activeTab);

  return (
    <div className="app-container">
      <div className="main-card">
        
        {/* HEADER */}
        <div className="header-section">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl filter drop-shadow-md">🥑</span>
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">FreshList</h1>
              <button onClick={shareList} className="ml-2 btn-icon-glass" title="Compartir WhatsApp">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.664-.698c.983.565 1.761.792 2.796.793 3.18 0 5.768-2.587 5.768-5.767s-2.588-5.767-5.768-5.767zm0 9.873c-.863 0-1.57-.22-2.316-.622l-1.371.36.368-1.325c-.456-.757-.665-1.391-.664-2.52 0-2.264 1.842-4.106 4.105-4.106 2.265 0 4.107 1.842 4.107 4.106 0 2.264-1.842 4.107-4.106 4.107z"/></svg>
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
                  onKeyDown={handleProductKeyDown} // <--- NUEVO: Capturamos Enter aquí
                  onFocus={() => setIsProductOpen(true)}
                  enterKeyHint="go" // <--- NUEVO: Pone el botón "Ir" en el teclado móvil
                  autoFocus 
                />
                
                {isProductOpen && filteredCatalog.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsProductOpen(false)}></div>
                    <ul className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20 text-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200">
                      {filteredCatalog.map((suggestion, index) => (
                        <li 
                          key={index} 
                          className="px-4 py-2 hover:bg-orange-50 hover:text-orange-700 cursor-pointer text-sm flex justify-between items-center transition-colors border-b border-gray-50 last:border-0"
                          onClick={() => handleSuggestionClick(suggestion)} 
                        >
                          <span className="font-medium">{suggestion}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full group-hover:bg-orange-100 group-hover:text-orange-600">Añadir</span>
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
                    placeholder="Tienda" 
                    className="input-field pr-8"
                    value={newStore} 
                    onKeyDown={handleStoreKeyDown} // <--- MODIFICADO: Lógica robusta
                    onChange={(e) => { setNewStore(e.target.value); setIsStoreOpen(true); }} 
                    onFocus={() => setIsStoreOpen(true)} 
                    enterKeyHint="go" // <--- NUEVO
                  />
                  <button type="button" onClick={() => setIsStoreOpen(!isStoreOpen)} className="absolute right-0 top-0 h-full px-3 text-emerald-600 hover:text-emerald-800 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>

                {isStoreOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsStoreOpen(false)}></div>
                    <ul className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20 text-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200">
                      
                      {/* TÍTULO STICKY */}
                      <li className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 cursor-default sticky top-0 z-10">
                        Elige tienda o supermercado
                      </li>

                      {sortedAvailableStores.map((store, index) => (
                        <li key={index} className="px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer text-sm flex justify-between items-center transition-colors group"
                          onClick={() => { setNewStore(store); openStoreTab(store); setIsStoreOpen(false); if(productInputRef.current) productInputRef.current.focus(); }}>
                          
                          <span className="flex-1">{store}</span>
                          
                          <button 
                            onClick={(e) => deleteStoreFromCatalog(e, store)}
                            className="p-1.5 rounded-full text-gray-300 hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            title="Eliminar tienda de la lista"
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
    </div>
  )
}

export default App