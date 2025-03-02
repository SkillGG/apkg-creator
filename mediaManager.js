/// <reference path="./mediaIDB.js" />

class MediaManager {
    constructor() {
        /** @type {string[]} */
        this.mediaNames = [];
        this.loadMediaNames();
    }
    loadMediaNames() {
        const mediaLS = localStorage.getItem("media");
        try {
            if (!mediaLS) {
                throw "No media in LocalStorage";
            }
            const medias = JSON.parse(mediaLS);
            if (
                Array.isArray(medias) &&
                medias.every((q) => typeof q === "string")
            ) {
                this.mediaNames = medias;
            }
        } catch (e) {
            localStorage.setItem("media", JSON.stringify([]));
        }
    }
    /**
     * Get media data from the database
     * @param {string} name
     * @returns {Promise<MediaData>} Media data
     */
    async media(name) {
        if (!this.mediaNames.includes(name)) throw "Media inaccessible!";
        const idb = await createMediaIDB("media");
        const data = await idb.getData("media", (idb) => {
            return idb.get(name);
        });
        idb.idb.close();
        return data;
    }
    /**
     * @param {MediaData} media
     */
    async putMedia(media) {
        const idb = await createMediaIDB("media");
        // console.log("Putting data", media);
        await idb.putData("media", [media]);
        /** @type {string[]} */
        const newMediaNames = await idb.getData("media", (getter) => {
            return getter.getAllKeys();
        });
        // console.log("new names", newMediaNames);
        this.mediaNames = newMediaNames;
        localStorage.setItem("media", JSON.stringify(newMediaNames));
        idb.idb.close();
    }

    async getPackagedMedia() {
        /** @type {MediaData[]} */
        const pMedia = [];
        for (const mediaName of this.mediaNames) {
            const media = await this.media(mediaName);
            if (media.package) pMedia.push(media);
        }
        return pMedia;
    }

    async removeMedia(name) {
        const idb = await createMediaIDB("media");
        await idb.delete("media", name);
        /** @type {string[]} */
        const newMediaNames = await idb.getData("media", (getter) => {
            return getter.getAllKeys();
        });
        // console.log("new names", newMediaNames);
        this.mediaNames = newMediaNames;
        localStorage.setItem("media", JSON.stringify(newMediaNames));
        idb.idb.close();
    }
}
