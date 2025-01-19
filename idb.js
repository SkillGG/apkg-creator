class IDB {
    getDB() {
        if (!this.idb) throw "No IDB Opened!";
        return this.idb;
    }
    /**
     * @param {string} store
     * @param {number} id
     * @returns {Promise<void>}
     */
    delete(store, id) {
        return new Promise((res, rej) => {
            const trans = this.getDB().transaction(store, "readwrite");
            const objStore = trans.objectStore(store);
            const delReq = objStore.delete(id);
            trans.onsuccess = res;
            delReq.onsuccess = res;
            trans.onerror = rej;
            delReq.onerror = rej;
            trans.commit();
        });
    }
    /**
     * @template T
     * @param {string} store
     * @param {(store: IDBObjectStore)=>IDBRequest} dataGetter
     *  @returns {Promise<T[]>}
     */
    getData(storeName, dataGetter) {
        return new Promise((res, rej) => {
            const db = this.getDB();
            if (!db) rej(new Error("No DB present!"));
            if (!db.objectStoreNames.contains(storeName)) {
                rej(new Error(`No Store named ${storeName}`));
                return;
            }
            const transaction = db.transaction(storeName, "readonly");
            console.log("got transaction");
            const objStore = transaction.objectStore(storeName);
            console.log("got object store");
            const request = dataGetter(objStore);
            request.onsuccess = () => {
                res(request.result);
            };
        });
    }
    /**
     * @param {string} storeName
     * @param {CardData[]} data
     * @returns {Promise<void>}
     */
    putData(storeName, data) {
        return new Promise((res, rej) => {
            if (data.length === 0) return res();
            const db = this.getDB();
            if (!db) rej(new Error("No DB present!"));
            if (!db.objectStoreNames.contains(storeName)) {
                rej(new Error(`No Store named ${storeName}`));
                return;
            }
            const transaction = db.transaction(storeName, "readwrite");
            console.log("got transaction");
            const objStore = transaction.objectStore(storeName);
            console.log("got object store");
            /** @type {{done:boolean}[]} */
            const done = [];
            /**
             * @param {()=>void} cb
             */
            const checkDone = (cb) => {
                if (done.every((d) => d.done)) {
                    cb();
                }
            };
            for (const card of data) {
                const state = { done: false };
                done.push(state);
                const req = objStore.put(card);
                req.onsuccess = () => {
                    state.done = true;
                    checkDone(() => {
                        res();
                    });
                };
            }
        });
    }
    /**
     * @param {string} name
     */
    constructor(name) {
        const idb = window.indexedDB.open(name, 5);
        idb.onupgradeneeded = (event) => {
            /** @type {IDBDatabase} */
            const db = event.target.result;
            if (event.oldVersion <= 4) {
                if (db.objectStoreNames.contains("cards"))
                    db.deleteObjectStore("cards");
            }
            console.log("creating an object store");
            const cards = db.createObjectStore("cards", {
                keyPath: "id",
            });
        };
        idb.onsuccess = () => {
            this.idb = idb.result;
        };
    }
}

/**
 * @param {string} name
 * @returns {Promise<IDB>}
 */
const createAnIDB = (name) =>
    new Promise((res, rej) => {
        const idb = new IDB(name);
        const interval = setInterval(() => {
            try {
                idb.getDB();
                clearInterval(interval);
                res(idb);
            } catch (err) {
                return;
            }
        }, 10);
    });
