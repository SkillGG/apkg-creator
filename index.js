/// @ts-check
/// <reference path="./genanki.d.ts" />
/// <reference path="./idb.js" />

const $ = (/** @type {string} */ s) => document.querySelector(`#${s}`);
const $$ = (/** @type {string} */ s) => document.querySelector(s);
const $A = (/** @type {string} */ a) => document.querySelectorAll(a);

const ELLIPSIS_THRESHOLD = 50;
const DEFAULT_DB = "kanjiguess";

const IDBname = localStorage.getItem("dbname") ?? DEFAULT_DB;
const dbString = localStorage.getItem("dbs") ?? "[]";
/** @type {string[]} */
let dbs = JSON.parse(dbString);

/** @type {Record<string, DeckData>} */
const DEFAULT_DECK_DATA = {
    kanjiguess: { id: 1736639633110, label: "文部科学省試験デッキ" },
};

/** @type {Record<string, DeckData>} */
const deckDatasJSON = JSON.parse(localStorage.getItem("deckdatas") ?? "null");
/** @type {Record<string, DeckData>} */
const deckDatas = {
    ...DEFAULT_DECK_DATA,
    ...deckDatasJSON,
};

/** @type {HTMLInputElement | null} */
const deckLabelInput = document.querySelector("#decklabel_input");
if (deckLabelInput) {
    deckLabelInput.value = deckDatas[IDBname].label ?? IDBname;
}
/** @type {HTMLInputElement | null} */
const deckLabel = document.querySelector("#decklabel");
if (deckLabel) {
    deckLabel.title = IDBname;
}

const nameLabel = $("dbname");
if (nameLabel)
    nameLabel.innerHTML = IDBname === DEFAULT_DB ? "(default)" : IDBname;

/** @type {HTMLDialogElement | null} */
const deckDialog = document.querySelector("dialog#deckDialog");
/**
 * @param {(db:string)=>void} click
 * @param {boolean=} canAdd
 * @param {()=>void} close
 */
const populateDialog = (click, canAdd = true, close = () => {}) => {
    if (deckDialog) {
        deckDialog.innerHTML = "";
        // close on backdrop click
        deckDialog.addEventListener("click", function (event) {
            var rect = deckDialog.getBoundingClientRect();
            var isInDialog =
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width;
            if (!isInDialog) {
                deckDialog.close();
                close();
            }
        });
        // default db button
        const defaultBtn = document.createElement("button");
        defaultBtn.innerText = deckDatas[DEFAULT_DB].label ?? "(default)";
        defaultBtn.onclick = () => {
            click(DEFAULT_DB);
        };
        defaultBtn.classList.add("dbbtn");
        defaultBtn.style.display = IDBname === DEFAULT_DB ? "none" : "";

        // add DB button
        const addBtn = document.createElement("button");
        addBtn.innerText = "Add";
        addBtn.classList.add("addbtn");
        addBtn.onclick = () => {
            const name = prompt("New DB name:");
            addDeck(name);
        };

        const options = [
            defaultBtn,
            ...dbs.map((db) => {
                // user-defined db buttons
                const button = document.createElement("button");
                button.innerText = deckDatas[db].label ?? db.replace("_", " ");
                button.classList.add("dbbtn");
                button.onclick = () => {
                    click(db);
                };
                button.style.display = IDBname === db ? "none" : "";

                return button;
            }),
        ];
        deckDialog.append(...options);
        if (canAdd) deckDialog.append(addBtn);
    }
};

/**
 *
 * @param {string} deck
 * @param {Note[]} notes
 */
const copyToDeck = async (deck, notes) => {
    if (!modelSelect) return;
    const newIDB = await createAnIDB(deck);
    const db = newIDB.getDB();
    const usedIDs = [];
    const done = [];
    /**
     * @param {()=>void} action
     */
    const checkDone = (action) => {
        if (done.every((q) => q.status)) {
            action();
        }
    };
    for (const note of notes) {
        const status = { status: false };
        done.push(status);
        const data = {
            id: new Date().getTime(),
            type: parseInt(modelSelect.value) ?? 0,
            note: { fields: note.fields },
        };
        while (usedIDs.includes(data.id)) {
            data.id = new Date().getTime();
        }
        usedIDs.push(data.id);
        const query = db
            .transaction("cards", "readwrite")
            .objectStore("cards")
            .put(data);
        query.onsuccess = () => {
            status.status = true;
            checkDone(() => {
                deckDialog?.close();
            });
        };
    }
};

const getSelectedNotes = () => {
    /** @type {NodeListOf<HTMLInputElement>} */
    const selectedNotes = document.querySelectorAll(
        "input[type='checkbox'].select_note"
    );
    /** @type {Note[]} */
    const notes = [];
    for (const note of selectedNotes) {
        if (!note.checked) continue;
        const noteid = parseInt(note.dataset?.noteid ?? "0");
        if (noteid) {
            const noteobj = globalDeck.notes.find(
                (n) => n.guid === `${noteid}`
            );
            if (noteobj) {
                notes.push(noteobj);
            }
        }
    }
    return notes;
};

const removeSelected = async () => {
    for (const note of getSelectedNotes()) {
        await removeCard(parseInt(note.guid));
    }
};

const showCopyToDeck = () => {
    const notes = getSelectedNotes();
    if (notes.length <= 0) return;
    populateDialog((deck) => {
        copyToDeck(deck, notes);
    }, false);
    deckDialog?.showModal();
};

/**
 * @param {string} name
 */
const swapDeck = (name) => {
    localStorage.setItem("dbname", name);
    window.location.reload();
};

const addDeck = (name) => {
    if (!name?.trim()) return;
    if (name === "kanjiguess") throw "Cannot create a duplicate default db!";
    if (dbs.includes(name)) throw "This name already exists!";
    const safeName = name.replaceAll(" ", "_");
    localStorage.setItem("dbname", safeName);
    localStorage.setItem("dbs", JSON.stringify([...dbs, safeName]));
    localStorage.setItem(
        "deckdatas",
        JSON.stringify({
            ...deckDatas,
            [safeName]: { id: new Date().getTime(), label: name },
        })
    );
    window.location.reload();
};

const applyNewDeckName = () => {
    if (deckLabelInput) {
        const newDeckName = deckLabelInput.value;
        if (newDeckName) {
            const prevDatas = deckDatas[IDBname];
            if (prevDatas) {
                const newDatas = {
                    ...deckDatas,
                    [IDBname]: { id: prevDatas.id, label: newDeckName },
                };
                localStorage.setItem("deckdatas", JSON.stringify(newDatas));
                window.location.reload();
            } else {
                throw "No deck data to change!";
            }
        } else {
            throw "Empty deck label";
        }
    }
};

const openDialog = () => {
    populateDialog((db) => swapDeck(db));
    if (deckDialog) {
        deckDialog.showModal();
    }
};

console.log("using db", IDBname);

/** @type {IDB} */
let idb;

// load SQL and init the IDB, then load the notes
Promise.all([
    // @ts-ignore
    initSqlJs({
        locateFile: (filename) => `js/sql/sql.wasm`,
    }).then(function (sql) {
        //Create the database
        // @ts-ignore
        window.SQL = sql;
    }),
    createAnIDB(IDBname),
]).then((results) => {
    idb = results[1];
    loaded();
});

const basicModel = new Model({
    name: `Kanji Guess, srokeless`,
    id: `${1736639633130}`,
    flds: [{ name: "Front" }, { name: "Back" }],
    req: [[0, "all", [0]]],
    tmpls: [
        {
            name: "Card 1",
            qfmt: "{{Front}}",
            afmt: `{{FrontSide}}
<hr id=answer>

{{Back}}`,
        },
    ],
});

const kanjiGuessModel = new Model({
    name: `Kanji Guess`,
    id: `${1736639633108}`,
    flds: [{ name: "Front" }, { name: "Back" }],
    req: [[0, "all", [0]]],
    tmpls: [
        {
            name: "Card 1",
            qfmt: "{{Front}}",
            afmt: `<style>
@font-face {
  font-family: KanjiStrokeOrders;
  src: url("_kanjiStrokeOrder.ttf");
}
            </style>{{FrontSide}}

<hr id=answer>

<span style="font-size: 40vw; font-family: KanjiStrokeOrders">
{{Back}}
</span>`,
        },
    ],
});

/** @type {Record<number, Model>} */
const models = { 0: kanjiGuessModel, 1: basicModel };

const modelSelect = document.querySelector("select");
if (!modelSelect) {
    throw "No modelSelect!";
}
window.onkeydown = (e) => {
    if (e.code === "KeyR" && e.altKey) {
        modelSelect.value = `${
            (parseInt(modelSelect.value) + 1) % Object.keys(models).length
        }`;
        modelSelect.dispatchEvent(new Event("change"));
    }
};
const getModel = () => {
    return models[parseInt(modelSelect.value)] ?? models[0];
};
for (const key in models) {
    const model = models[key];
    const option = document.createElement("option");
    option.value = key;
    option.innerText = model.props.name;
    modelSelect.append(option);
    modelSelect.value = localStorage.getItem("model") ?? "0";
    modelSelect.onchange = () => {
        localStorage.setItem("model", modelSelect.value);
        refreshNoteCreator();
        showNoteList();
        /** @type {HTMLInputElement} */
        (notecreator?.querySelector("input:not([type='checkbox'])"))?.focus();
    };
}

const globalDeck = new Deck(
    deckDatas[IDBname]?.id ?? DEFAULT_DECK_DATA[DEFAULT_DB].id,
    deckDatas[IDBname]?.label ?? DEFAULT_DECK_DATA[DEFAULT_DB].label
);

const saveDeckToFile = (/** @type {Deck} */ deck) => {
    let p = new Package();
    p.addDeck(deck);
    p.addMediaFile("_kanjiStrokeOrder.ttf");

    p.writeToFile(`${IDBname}.apkg`);
};

let cardsInTick = 0;

const toggleAllNotes = () => {
    /** @type {NodeListOf<HTMLInputElement>} */
    const notes = document.querySelectorAll("input.select_note");
    const allSelected = Array.from(notes).every((n) => n.checked);
    for (const note of notes) {
        note.checked = allSelected ? false : true;
    }
};

const showNoteList = () => {
    try {
        const fieldlist = $("fieldlist");

        const notesTable = $("notes");

        if (!fieldlist) throw "No fieldlist!";
        if (!notesTable) throw "No notesTable!";

        fieldlist.innerHTML = `<th><button onclick='toggleAllNotes()'>&nbsp;</button></th>${getModel()
            .props.flds.map((f) => `<th>${f.name}</th>`)
            .join("")}`;

        notesTable.innerHTML = "";

        globalDeck.notes.forEach((note) => {
            if (note.model.props.id !== getModel().props.id) return;
            const noteTr = document.createElement("tr");
            noteTr.dataset.noteId = note.guid;
            const ispossibleduplicate = globalDeck.notes.filter((xnote) => {
                if (xnote.guid === note.guid) return false;
                return (
                    note.fields[1] === xnote.fields[1] ||
                    note.fields[0] === xnote.fields[0]
                );
            });

            if (ispossibleduplicate.length > 0) {
                if (
                    ispossibleduplicate.some((xnote) => {
                        let i = 0;
                        for (const field of xnote.fields) {
                            if (field !== note.fields[i]) return false;
                            i++;
                        }
                        return true;
                    })
                ) {
                    noteTr.style.backgroundColor = "red";
                } else {
                    noteTr.style.backgroundColor = "orange";
                    noteTr.onclick = () => {
                        document
                            .querySelector(
                                `[data-note-id='${ispossibleduplicate[0].guid}']`
                            )
                            ?.scrollIntoView({ behavior: "smooth" });
                    };
                }
            }

            const td1 = document.createElement("td");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.noteid = note?.guid ?? 0;
            checkbox.classList.add("select_note");
            td1.append(checkbox);
            noteTr.append(td1);
            let i = 0;
            for (const fld of note.model.props.flds) {
                const td = document.createElement("td");
                td.title = note.guid;
                td.innerText = `${note.fields[i].substring(
                    0,
                    ELLIPSIS_THRESHOLD
                )}${note.fields[i].length > ELLIPSIS_THRESHOLD ? "..." : ""}`;
                noteTr.append(td);
                i++;
            }

            const delTd = document.createElement("td");
            const delBtn = document.createElement("button");
            delBtn.innerText = "Remove";
            delBtn.onclick = (e) => {
                removeCard(parseInt(note.guid));
                e.preventDefault();
                e.stopPropagation();
            };
            delTd.append(delBtn);
            noteTr.append(delTd);
            notesTable.appendChild(noteTr);
        });
    } catch (err) {
        alert(`ERROR! ${err}`);
    }
};

const loadCardsFromDB = () => {
    return /** @type {Promise<CardData[]>} */ (
        new Promise((res, rej) => {
            const db = idb.getDB();
            const cards = db.transaction("cards").objectStore("cards").getAll();
            cards.onsuccess = () => {
                res(cards.result);
            };
        })
    );
};

const loaded = () => {
    loadCardsFromDB().then((cards) => {
        for (const card of cards) {
            const model = models[card.type] ?? kanjiGuessModel;
            addCardToDeck(model.note(card.note.fields, []), card.id);
        }
        showNoteList();
    });
};

const notecreator = $("notecreator");
if (!notecreator) throw "No notecreator";
const refreshNoteCreator = () => {
    notecreator.innerHTML = "";
    notecreator.append(
        ...getModel().props.flds.map(({ name }) => {
            const label = document.createElement("label");
            label.style.cssText = "display: block";
            label.id = `${name}_input`;
            label.dataset.field = name;
            const div = document.createElement("div");
            div.innerText = name;
            const IMEcheckbox = document.createElement("input");
            IMEcheckbox.type = "checkbox";
            IMEcheckbox.checked = !localStorage.getItem(`noIME_${name}`);
            div.append(IMEcheckbox);
            const input = document.createElement("input");
            label.append(div, input);
            input.type = IMEcheckbox.checked ? "text" : "tel";
            // @ts-ignore
            input.style.imeMode = IMEcheckbox.checked ? "active" : "unset";
            IMEcheckbox.onchange = (e) => {
                // @ts-ignore
                input.style.imeMode = IMEcheckbox.checked ? "active" : "unset";
                if (IMEcheckbox.checked) {
                    // turn on IM
                    input.type = "text";
                    localStorage.removeItem(`noIME_${name}`);
                }
                if (!IMEcheckbox.checked) {
                    // turn off IME
                    input.type = "tel";
                    localStorage.setItem(`noIME_${name}`, "true");
                }
            };
            return label;
        })
    );
    /** @type {NodeListOf<HTMLInputElement>} */
    const inputs = notecreator.querySelectorAll(
        "input[type='text'],input[type='tel']"
    );
    for (let i = 0; i < inputs.length; i++) {
        if (i === inputs.length - 1) {
            inputs[i].onkeydown = (e) => {
                if (e.code === "Enter" && e.ctrlKey) {
                    addCard.click();
                    inputs[0].focus();
                }
            };
        } else {
            inputs[i].onkeydown = (e) => {
                if (e.code === "Enter" && e.ctrlKey) inputs[i + 1].focus();
            };
        }
    }
    const addCard = document.createElement("button");

    addCard.innerHTML = "Add";

    addCard.onclick = () => {
        /** @type {[string, string][]} */
        const field_values = Array.from(
            notecreator.querySelectorAll("label")
        ).map((label) => {
            /** @type {HTMLInputElement|null} */
            const input = label.querySelector("input:not([type='checkbox'])");
            /** @type {[string, string]} */
            const ret = [label.dataset.field ?? "", input?.value ?? ""];
            return ret;
        });

        if (field_values.some((f) => f[1].trim() === "")) throw "Empty field!";

        const note = getModel().note(
            field_values.map((f) =>
                f[1]
                    .replaceAll("￥", "/ ")
                    .replaceAll("<", "&lt;")
                    .replaceAll(">", "&gt;")
            ),
            []
        );

        addCardToDeck(note);
    };

    notecreator.append(addCard);
};
refreshNoteCreator();

const takenIds = [];

/**
 *
 * @param {Note} note
 * @param {number} id
 */
const addCardToDeck = (note, id = 0) => {
    if (id === 0) {
        /** @type {CardData} */
        const data = {
            id: new Date().getTime(),
            type: parseInt(modelSelect.value) ?? 0,
            note: { fields: note.fields },
        };
        while (takenIds.includes(data.id)) {
            data.id = new Date().getTime();
        }
        takenIds.push(data.id);
        note._guid = `${data.id}`;
        const putAction = idb
            .getDB()
            .transaction("cards", "readwrite")
            .objectStore("cards")
            .put(data);
        putAction.onsuccess = () => {
            globalDeck.addNote(note);
            setTimeout(showNoteList, 10);
        };
    } else {
        note._guid = `${id}`;
        globalDeck.addNote(note);
        setTimeout(showNoteList, 10);
    }
    if (notecreator) {
        /** @type {NodeListOf<HTMLInputElement>} */
        const inputs = notecreator.querySelectorAll(
            "input:not([type='checkbox'])"
        );
        inputs.forEach((i) => (i.value = ""));
    }
};

/**
 * @param {number} id
 */
const removeCard = async (id) => {
    try {
        const card = globalDeck.notes.findIndex(
            (note) => note.guid === `${id}`
        );
        if (card >= 0) {
            globalDeck.notes.splice(card, 1);
        }
        await idb.delete("cards", id);
        showNoteList();
    } catch (err) {
        alert(`ERROR! ${err}`);
    }
};

const DEFAULT_PARSE = `
const matches = value.matchAll(
    /(?<word>.*?)\\((?<reading>.*?)\\):(?<meaning>.*?)(?:\\n|$)/gim
);

for (const match of matches) {
    const groups = match.groups;
    if (groups) {
        cardsInTick = match.length;
        const { word, reading, meaning } = groups;
        if (!word.trim() || !reading.trim() || !meaning.trim()) continue;
        noteValues.push([
            \`\${reading.trim()} - \${meaning.trim()}\`,
            \`\${word.trim()}\`,
        ]);
    }
}
`.trim();

const getCurParserName = () => {
    const local = localStorage.getItem("curparser");
    if (!local) {
        localStorage.setItem("curparser", "DEFAULT");
        return "DEFAULT";
    } else {
        if (local in getSavedCodeParsers()) {
            return local;
        }
        return "DEFAULT";
    }
};

/**
 * @param {string} parser
 * @param {string | null} newCode
 */
const updateParser = (parser, newCode) => {
    if (newCode) parserCodes[parser] = newCode;
    else delete parserCodes[parser];
    localStorage.setItem("parsers", JSON.stringify(parserCodes));
};

const getSavedCodeParsers = () => {
    /** @type {Record<string, string>} */
    const parsers = {};

    try {
        const str = localStorage.getItem("parsers");
        const json = JSON.parse(str ?? "{}");

        if (typeof json !== "object" || !json || Array.isArray(json)) throw "";

        for (const key in json) {
            const _code = json[key];
            if (typeof _code !== "string") continue;
            parsers[key] = _code;
        }
    } catch (err) {
        return parsers;
    }

    return parsers;
};

const parserCodes = { DEFAULT: DEFAULT_PARSE, ...getSavedCodeParsers() };

const parseCards = () => {
    /** @type {HTMLTextAreaElement | null} */
    const area = document.querySelector("textarea");
    if (!area) throw "No textarea";
    const value = area.value;
    if (!value) return "No value!";
    area.value = "";
    /**
     * @type {string[][]}
     */
    const noteValues = [];

    eval(getCurParserName());

    for (const note of noteValues) {
        addCardToDeck(getModel().note(note, []));
    }
};

const saveDeck = () => {
    saveDeckToFile(globalDeck);
};

/**
 * @template {readonly string[]} Keys
 * @template {Record<Keys[number], unknown>} Obj
 * @param {Keys} keys
 * @param {object} obj
 * @returns {obj is Obj}
 */
const hasAll = (keys, obj) => {
    return keys.every((key) => key in obj);
};

/**
 * @param {unknown} obj
 */
const checkDeckTyping = (obj) => {
    if (typeof obj !== "object") return null;
    if (Array.isArray(obj)) return null;
    if (!obj) return null;
    /** @type {Record<string, FullDeckData>} */
    const retObj = {};
    for (const deckName in obj) {
        const deck = obj[deckName];
        const keys = /** @type {const} */ ([
            "id",
            "name",
            "label",
            "cards",
            "parsers",
        ]);
        if (hasAll(keys, deck)) {
            if (typeof deck.id !== "number") continue;
            if (typeof deck.label !== "string") continue;
            if (typeof deck.name !== "string") continue;
            if (typeof deck.parsers !== "object" && deck.parsers) continue;
            if (typeof deck.cards !== "object" || !Array.isArray(deck.cards))
                continue;
            /** @type {FullDeckData} */
            const dk = {
                cards: /** @type {CardData[]} */ (deck.cards),
                id: deck.id,
                label: deck.label,
                name: deck.name,
                parsers: /** @type {Record<string,string>}*/ (deck.parsers),
            };
            retObj[deckName] = dk;
        }
    }
    return retObj;
};

/** @typedef {{label: string; cards: CardData[]; id: number; name: string; parsers?: Record<string,string> }} FullDeckData */

/**
 * @param {HTMLButtonElement} importBtn
 */
const importDecks = async (importBtn) => {
    const initState = importBtn.innerHTML;
    try {
        const fileAsker = document.createElement("input");
        fileAsker.type = "file";
        fileAsker.accept = ".ganki";
        fileAsker.click();
        importBtn.innerText = "Selecting file...";
        fileAsker.onchange = async () => {
            try {
                importBtn.innerText = "Loading file...";
                const file = fileAsker.files?.[0];
                if (file) {
                    const text = await file.text();
                    console.log("Got file", file);
                    const json = JSON.parse(text);

                    console.log("Parsed successfully");

                    const decks = checkDeckTyping(json);

                    console.log(decks);

                    for (const deckName in decks) {
                        console.log("Importing deck", deckName);
                        try {
                            const deck = decks[deckName];

                            const idb = await createAnIDB(deckName);

                            await idb.putData("cards", deck.cards);

                            if (deck.parsers) {
                                console.log("Got parsers, ", deck.parsers);
                                for (const parser in deck.parsers) {
                                    updateParser(parser, deck.parsers[parser]);
                                }
                            }

                            if (deckName !== DEFAULT_DB)
                                dbs = [...new Set([...dbs, deckName])];

                            deckDatas[deckName] = {
                                id: deck.id,
                                label: deck.label,
                            };
                        } catch (err) {
                            continue;
                        }
                    }

                    localStorage.setItem("dbs", JSON.stringify(dbs));
                    localStorage.setItem(
                        "deckdatas",
                        JSON.stringify(deckDatas)
                    );

                    window.location.reload();
                }
            } catch (err) {
                importBtn.innerHTML = initState;
                alert(`ERROR #fileAsker::onchange\n${err}`);
            }
        };
        fileAsker.oncancel = () => {
            importBtn.innerHTML = initState;
        };
    } catch (err) {
        alert(`ERROR #importDecks\n${err.message}`);
        importBtn.innerHTML = initState;
    }
};

/**
 * @param {HTMLButtonElement} exportBtn
 */
const exportDeck = async (exportBtn) => {
    const initState = exportBtn.innerHTML;
    try {
        exportBtn.innerText = "Gathering data...";
        idb.idb.close();
        /** @type {Record<string, FullDeckData>} */
        const allDecksObj = {};

        for (const name in deckDatas) {
            const { id, label } = deckDatas[name];

            const idb = await createAnIDB(name);

            /** @type {CardData[]} */
            const cards = await idb.getData("cards", (store) => {
                return store.getAll();
            });

            allDecksObj[name] = {
                id,
                label,
                name,
                cards,
                parsers: parserCodes,
            };
            idb.idb.close();
        }
        exportBtn.innerText = "Creating output file...";
        const file = new Blob([JSON.stringify(allDecksObj, undefined, 4)], {
            type: "application/json",
        });

        // @ts-ignore
        saveAs(file, "export.ganki");
        exportBtn.innerHTML = initState;
    } catch (e) {
        alert(`Error #exportDeck\n${e.message}`);
    }
};

/**
 * @param {string} parser
 */
const removeCodeParser = (parser) => {
    if (parser === "DEFAULT") return;
    updateParser(parser, null);
};

const editParser = () => {
    /**
     * @type {HTMLDialogElement | null}
     */
    const dialog = document.querySelector("dialog#parseDialog");
    if (!dialog) return;

    dialog.addEventListener("click", function (event) {
        var rect = dialog.getBoundingClientRect();
        var isInDialog =
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width;
        if (!isInDialog) {
            dialog.close();
            close();
        }
    });

    const listDiv = dialog.querySelector("div");
    const input = dialog.querySelector("textarea");
    /** @type {HTMLButtonElement | null} */
    const saveBtn = dialog.querySelector("#saveParserCode");

    /** @type {HTMLButtonElement | null} */
    const removeBtn = dialog.querySelector("#removeCodeParser");
    if (!listDiv || !input || !saveBtn || !removeBtn) return;
    listDiv.innerHTML = "";

    /** @type {Record<string, HTMLDivElement>} */
    const divs = {};

    /**
     * @param {string} parser
     */
    const setCodeEditor = (parser) => {
        localStorage.setItem("curparser", parser);
        input.value = parserCodes[parser];
        for (const div in divs) {
            divs[div].dataset.selected = "false";
        }
        divs[parser].dataset.selected = "true";
        saveBtn.onclick = () => {
            const tarea = dialog.querySelector("textarea");
            if (tarea) updateParser(parser, tarea.value);
            saveBtn.innerHTML = "SAVED";
            setTimeout(() => (saveBtn.innerHTML = "Save"), 2000);
        };
        removeBtn.disabled = parser === "DEFAULT";
        removeBtn.onclick = () => {
            removeCodeParser(parser);
            editParser();
        };

        /** @type {HTMLButtonElement | null} */
        const testBtn = dialog.querySelector("#testBtn");

        if (testBtn) {
            testBtn.onclick = () => {
                /** @type {HTMLTextAreaElement | null} */
                const area = dialog.querySelector("#testValue");
                /** @type {HTMLDivElement | null} */
                const result = dialog.querySelector("#codeResult");

                /** @type {HTMLTextAreaElement | null} */
                const code = dialog.querySelector("#code");

                if (!area || !result || !code) return;
                result.innerHTML = "";

                const value = area.value;

                /** @type {string[][]} */
                const noteValues = [];

                eval(code.value);

                for (const note of noteValues) {
                    const div = document.createElement("div");
                    div.classList.add("testnote");
                    for (const field of note) {
                        const fieldDiv = document.createElement("div");
                        fieldDiv.classList.add("testfield");
                        div.append(fieldDiv);
                        fieldDiv.innerHTML = field;
                    }
                    result.append(div);
                }
            };
        }
    };

    console.log("Cur parser: ", getCurParserName());

    for (const parserID in parserCodes) {
        const div = document.createElement("div");
        divs[parserID] = div;
        if (parserID === getCurParserName()) setCodeEditor(parserID);
        div.classList.add("parserSelect");
        div.innerText = parserID;
        div.onclick = () => {
            setCodeEditor(parserID);
        };
        listDiv.append(div);
    }

    const addParser = document.createElement("div");
    addParser.innerText = "+";

    addParser.onclick = () => {
        const id = prompt("New parser's name:");
        if (!id) return;
        if (id in parserCodes) return;
        localStorage.setItem("curparser", id);
        updateParser(id, "// write your parser code here");
        editParser();
    };

    listDiv.append(addParser);

    dialog.showModal();
};
