function ankiHash(fields: Field[]): string;

declare const MODEL_STD = 0;
declare const MODEL_CLOZE = 1;
declare const defaultModel: Model;
declare const defaultField: Field;
declare const defaultTemplate: Template;
declare const defaultConf: Conf;
declare const defaultDeckConf: DeckConf;
declare const defaultDeck: DefaultDeck;

type DeckData = { id: number; label: string };

type DefaultDeck = {
    /** [currentDay, count] */
    newToday: [number, number];
    /** [currentDay, count] */
    revToday: [number, number];
    /** [currentDay, count] */
    lrnToday: [number, number];
    /** time in ms */
    timeToday: [number, number];
    conf: number;
    usn: number;
    desc: string;
    /** anki uses int/bool interchangably here */
    dyn: number | boolean;
    collapsed: boolean;
    /** added in beta11 */
    extendNew: number;
    /** added in beta11 */
    extendRev: number;
};

/** mix new cards with reviews */
declare const NEW_CARDS_DISTRIBUTE = 0;
/** show new cards last */
declare const NEW_CARDS_LAST = 1;
/** show new cards first */
declare const NEW_CARDS_FIRST = 2;
/** new card insertion order randomly */
declare const NEW_CARDS_RANDOM = 0;
/** new card insertion order by due */
declare const NEW_CARDS_DUE = 1;

declare const STARTING_FACTOR = 2500;

type ModelProps = {
    id: string;
    req: [number, "all" | "any", Array<number>][];
    flds: { name: string }[];
    tmpls: {
        name?: string;
        /** HTML template for the question */
        qfmt: string;
        /** HTML template for the answer */
        afmt: string;
    }[];
    name: string;

    /** sort field */
    sortf: number;
    /** deck id */
    did: number;
    latexPre: string;
    latexPost: string;
    /** modification time */
    mod: number;
    /** unsure, something to do with sync? */
    usn: 0;
    /** unused */
    vers: never[];
    type: typeof MODEL_STD | typeof MODEL_CLOZE;
    css: string;
    tags: string[];
};

type DefaultModelPropKeys =
    | "sortf"
    | "did"
    | "latexPre"
    | "latexPost"
    | "mod"
    | "usn"
    | "vers"
    | "type"
    | "css"
    | "tags";

class Model {
    props: ModelProps;
    fieldNameToOrd: Field["ord"][];
    constructor(prop: Omit<ModelProps, DefaultModelPropKeys>);
    /** Create a note using this model */
    note(fields: string[], tags: string[], guid: string | null = null): Note;
}

class ClozeModel extends Model {
    constructor(props: ModelProps);
}

class Deck {
    notes: Note[];
    constructor(id: number, name: string, desc = "");
    addNote(note: Note);
}

type Template = {
    name: string;
    ord: number | null;
    /** Front format */
    qfmt: string;
    /** Back format */
    afmt: string;
    /** deck id */
    did: number | null;
    bqfmt: string;
    bafmt: string;
};

type DeckConf = {
    name: string;
    new: {
        delays: number[];
        ints: number[];
        initialFactor: number;
        separate: boolean;
        order: typeof NEW_CARDS_DUE | typeof NEW_CARDS_RANDOM;
        perDay: number;
        /** may not be set on old decks */
        bury: boolean;
    };
    lapse: {
        delays: number[];
        mult: number;
        minInt: number;
        leechFails: number;
        /** 0=suspend, 1=tagonly */
        leechAction: 0 | 1;
    };
    rev: {
        perDay: number;
        ease4: number;
        fuzz: number;
        /** not currently used */
        minSpace: number;
        ivlFct: number;
        maxIvl: number;
        /** may not be set on old decks */
        bury: boolean;
        hardFactor: number;
    };
    maxTaken: number;
    timer: number;
    autoplay: boolean;
    replayq: boolean;
    mod: number;
    usn: number;
};

type Conf = {
    // review options
    activeDecks: number[];
    curDeck: number;
    newSpread:
        | typeof NEW_CARDS_DISTRIBUTE
        | typeof NEW_CARDS_FIRST
        | typeof NEW_CARDS_LAST;
    collapseTime: number;
    timeLim: number;
    estTimes: boolean;
    dueCounts: boolean;
    // other config
    curModel: Model | null;
    nextPos: number;
    sortType: "noteFld";
    sortBackwards: boolean;
    /** add new to currently selected deck? */
    addToCur: boolean;
    dayLearnFirst: boolean;
};

type FieldMedia =
    | { name: string; data: any }
    | { name: string; filename: string };

type Field = {
    name: string;
    ord: number | null;
    sticky: boolean;
    rtl: boolean;
    font: string;
    size: number;
    media: FieldMedia;
};

class Note {
    model: Model;
    fields: string[];
    tags: string[] | null;
    _guid: string | null;
    get guid(): string;
    constructor(
        model: Model,
        fields: string[],
        tags: string[] | null = null,
        guid = null
    );

    get guid(): string;

    get cards(): number[];
}

class Package {
    decks: Deck[];
    media: FieldMedia[];
    addDeck(deck: Deck): void;
    addMedia(data: any, name: string): void;
    addMediaFile(filename: string, name = null): void;
    writeToFile(filename: string): void;
    write(db: any): void;
}

type CardData = { id: number; type: number; note: { fields: string[] } };
