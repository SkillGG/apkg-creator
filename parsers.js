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
    /** @type {HTMLTextAreaElement} */
    const area = $$("textarea");
    const value = area.value;
    if (!value) return "No value!";
    area.value = "";
    /**
     * @type {string[][]}
     */
    const noteValues = [];

    eval(parserCodes[getCurParserName()]);

    for (const note of noteValues) {
        addCardToDeck(getModel().note(note, []));
    }
};
