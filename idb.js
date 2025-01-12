class IDB {
    getDB() {
        if (!this.idb) throw "No IDB Opened!";
        return this.idb;
    }
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
        idb.onsuccess = (event) => {
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
