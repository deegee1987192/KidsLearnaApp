// Tiny IndexedDB wrapper for the `homeworkQuest` database — KL.hw.db
// Stores: children (keyPath id), dailyMissions (key `${childId}_${date}`),
//         settings (key "main"), history (auto-increment).
(function(){
  'use strict';
  window.KL = window.KL || {};
  const hw = (KL.hw = KL.hw || {});

  const NAME = 'homeworkQuest', VERSION = 1;
  const STORES = ['children', 'dailyMissions', 'settings', 'history'];
  let dbp = null;

  function open(){
    if(dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains('children'))      db.createObjectStore('children', { keyPath: 'id' });
        if(!db.objectStoreNames.contains('dailyMissions')) db.createObjectStore('dailyMissions');
        if(!db.objectStoreNames.contains('settings'))      db.createObjectStore('settings');
        if(!db.objectStoreNames.contains('history'))       db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbp = null; reject(req.error); };
    });
    return dbp;
  }

  async function run(store, mode, fn){
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  const get    = (store, key)        => run(store, 'readonly',  s => s.get(key));
  const getAll = (store)             => run(store, 'readonly',  s => s.getAll());
  const keys   = (store)             => run(store, 'readonly',  s => s.getAllKeys());
  const put    = (store, value, key) => run(store, 'readwrite', s => key === undefined ? s.put(value) : s.put(value, key));
  const del    = (store, key)        => run(store, 'readwrite', s => s.delete(key));
  const clear  = (store)             => run(store, 'readwrite', s => s.clear());

  hw.db = { open, get, getAll, keys, put, delete: del, clear, STORES };
})();
