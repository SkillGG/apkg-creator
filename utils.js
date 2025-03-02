/**
 * @template {HTMLElement} [Q = HTMLDivElement]
 * @param {string} q
 * @returns {Q}
 */
const $ = (q) => $$(`#${q}`);

/**
 * @template {HTMLElement} [Q = HTMLDivElement]
 * @param {string} query
 * @returns {Q}
 */
const $$ = (query) => {
    /** @type {Q | null} */
    const el = document.querySelector(query);
    if (el) return el;
    throw `Could not find element with query '${query}'`;
};

/**
 * @template {HTMLElement} [Q = HTMLDivElement]
 * @param {string} query
 * @returns {NodeListOf<Q>}
 */
const $_ = (query) => {
    /** @type {NodeListOf<Q>} */
    const els = document.querySelectorAll(query);
    return els;
};

/**
 *
 * @param {HTMLDialogElement} dialog
 * @param {()=>void} [closeCallback]
 */
const makeDialogBackdropExitable = (dialog, closeCallback) => {
    dialog.addEventListener("click", function (event) {
        var rect = dialog.getBoundingClientRect();
        var isInDialog =
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width;
        if (!isInDialog) {
            dialog.close();
            closeCallback?.();
        }
    });
};
