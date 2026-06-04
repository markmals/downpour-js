const HONORIFICS = "dr|mr|mrs|ms|phd";

/**
 * Removes certain characters from the beginning and end of a string, replaces
 * periods, underscores, and brackets with spaces, and collapses the result —
 * while preserving the trailing period of an honorific (Mr./Mrs./Dr./Ms./PhD.).
 */
export function cleanString(str: string): string {
    // Defensive: never throw on a non-string (e.g. an undefined slice).
    if (typeof str !== "string") return "";

    let cleaned = str
        // Strip any mixed run of leading/trailing delimiters in a single pass.
        .replace(/^[-.\s_()\[\]{}]+|[-.\s_()\[\]{}]+$/g, "");

    cleaned = cleaned
        // "Mr.Bean's.Holiday" -> "Mr.Bean's Holiday"
        // The honorific must be a WHOLE word (\b), so ordinary words ending in
        // those letters (Films, Atoms, Programs…) are not mistaken for honorifics.
        .replaceAll(new RegExp(`(?<!\\b(?:${HONORIFICS}))\\.`, "gi"), " ")
        // "Mr.Bean's Holiday" -> "Mr. Bean's Holiday"
        .replaceAll(new RegExp(`\\b(${HONORIFICS})\\.`, "gi"), "$1. ")
        // Brackets/parens/underscores become spaces (dashes are kept inside words).
        .replaceAll(/[_()\[\]{}]/g, " ")
        // Collapse any interior whitespace the steps above introduced.
        .replaceAll(/\s+/g, " ")
        .trim();

    return cleaned;
}
