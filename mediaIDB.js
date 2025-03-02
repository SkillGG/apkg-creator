/** @typedef {{name: string, data:any, info: {size: number, type?: string, desc?: string}, package: boolean}} MediaData */

class MediaIDB {
    getDB() {
        if (!this.idb) throw "No IDB Opened!";
        return this.idb;
    }
    /**
     * @param {string} store
     * @param {string} name
     * @returns {Promise<void>}
     */
    delete(store, name) {
        return new Promise((res, rej) => {
            const trans = this.getDB().transaction(store, "readwrite");
            const objStore = trans.objectStore(store);
            const delReq = objStore.delete(name);
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
            const objStore = transaction.objectStore(storeName);
            const request = dataGetter(objStore);
            request.onsuccess = () => {
                res(request.result);
            };
        });
    }
    /**
     * @param {string} storeName
     * @param {MediaData[]} data
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
            const objStore = transaction.objectStore(storeName);
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
            for (const media of data) {
                const state = { done: false };
                done.push(state);
                const req = objStore.put(media);
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
        const idb = window.indexedDB.open(name, 1);
        idb.onupgradeneeded = (event) => {
            /** @type {IDBDatabase} */
            const db = event.target.result;
            const media = db.createObjectStore("media", {
                keyPath: "name",
            });
        };
        idb.onsuccess = () => {
            this.idb = idb.result;
        };
    }
}

/**
 * @param {string} name
 * @returns {Promise<MediaIDB>}
 */
const createMediaIDB = (name) =>
    new Promise((res, rej) => {
        const idb = new MediaIDB(name);
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
