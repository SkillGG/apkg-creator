/// @ts-check
/// <reference path="./genanki.d.ts" />
/// <reference path="./idb.js" />
/// <reference path="./kso.js" />

const $ = (/** @type {string} */ s) => document.querySelector(`#${s}`);
const $$ = (/** @type {string} */ s) => document.querySelector(s);
const $A = (/** @type {string} */ a) => document.querySelectorAll(a);

const ELLIPSIS_THRESHOLD = 50;
const DEFAULT_DB = "kanjiguess";

const IDBname = localStorage.getItem("dbname") ?? DEFAULT_DB;
const dbString = localStorage.getItem("dbs") ?? "[]";
/** @type {string[]} */
const dbs = JSON.parse(dbString);

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
const dialog = document.querySelector("dialog");
if (dialog) {
    // close on backdrop click
    dialog.addEventListener("click", function (event) {
        var rect = dialog.getBoundingClientRect();
        var isInDialog =
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width;
        if (!isInDialog) {
            dialog.close();
        }
    });
    // default db button
    const defaultBtn = document.createElement("button");
    defaultBtn.innerText = deckDatas[DEFAULT_DB].label ?? "(default)";
    defaultBtn.onclick = () => {
        swapDeck(DEFAULT_DB);
    };
    defaultBtn.classList.add("dbbtn");

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
                swapDeck(db);
            };
            return button;
        }),
        addBtn,
    ];
    dialog.append(...options);
}

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
    if (dialog) {
        dialog.showModal();
    }
};

console.log("using db", IDBname);

/** @type {IDB} */
let idb;

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
    name: "Kanji Guess, srokeless",
    id: "1736639633130",
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
    name: "Kanji Guess",
    id: "1736639633108",
    flds: [{ name: "Front" }, { name: "Back" }],
    req: [[0, "all", [0]]],
    tmpls: [
        {
            name: "Card 1",
            qfmt: "{{Front}}",
            afmt: `<style>
@font-face {
  font-family: KanjiStrokeOrder;
  src: url("_kanjiStrokeOrder.ttf");
}
            </style>{{FrontSide}}

<hr id=answer>

<span style="font-size:20vw; font-family: KanjiStrokeOrders">
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
    console.log(e.code);
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

const showNoteList = () => {
    const fieldlist = $("fieldlist");

    const notesTable = $("notes");

    if (!fieldlist) throw "No fieldlist!";
    if (!notesTable) throw "No notesTable!";

    fieldlist.innerHTML = `${getModel()
        .props.flds.map((f) => `<th>${f.name}</th>`)
        .join("")}`;

    notesTable.innerHTML = "";

    globalDeck.notes.forEach((note) => {
        if (note.model.props.id !== getModel().props.id) return;
        const noteTr = document.createElement("tr");
        const ispossibleduplicate = globalDeck.notes.some((xnote) => {
            if (xnote.id === note.id) return false;
            return (
                note.fields[1] === xnote.fields[1] ||
                note.fields[0] === xnote.fields[0]
            );
        });
        if (ispossibleduplicate) {
            noteTr.style.backgroundColor = "orange";
        }
        noteTr.innerHTML = `
${note.model.props.flds
    .map((f, i) => {
        return `<td title='${note.id}'>${note.fields[i].substring(
            0,
            ELLIPSIS_THRESHOLD
        )}${note.fields[i].length > ELLIPSIS_THRESHOLD ? "..." : ""}</td>`;
    })
    .join("")}<td><button onclick='removeCard(${
            note.id
        })'>Remove</button></td>`;
        notesTable.appendChild(noteTr);
    });
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
        console.log(cards);
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
        console.log("Adding a new card to deck, ", data);
        note.id = data.id;
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
        note.id = id;
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
const removeCard = (id) => {
    console.log("removing id, ", id);
    const card = globalDeck.notes.findIndex((note) => note.id === id);
    if (card >= 0) {
        globalDeck.notes.splice(card, 1);
    }
    const deleteQuery = idb
        .getDB()
        .transaction("cards", "readwrite")
        .objectStore("cards")
        .delete(id);
    deleteQuery.onsuccess = () => {
        showNoteList();
    };
};

const parseCards = () => {
    /** @type {HTMLTextAreaElement | null} */
    const area = document.querySelector("textarea");
    if (!area) throw "No textarea";
    const value = area.value;
    if (!value) return "No value!";
    area.value = "";

    const matches = value.matchAll(
        /(?<word>.*?)\((?<reading>.*?)\):(?<meaning>.*?)(?:\n|$)/gim
    );
    for (const match of matches) {
        const groups = match.groups;
        if (groups) {
            cardsInTick = match.length;
            const { word, reading, meaning } = groups;
            if (!word.trim() || !reading.trim() || !meaning.trim()) continue;
            addCardToDeck(
                getModel().note(
                    [`${reading.trim()} - ${meaning.trim()}`, `${word.trim()}`],
                    []
                )
            );
        }
    }
};

const saveDeck = () => {
    saveDeckToFile(globalDeck);
};
