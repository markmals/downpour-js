/**
 * Removes certain characters from the beginning and end of a string,
 * and replaces periods and underscores wtih spaces
 */
export function cleanString(str: string): string {
    let cleanedString = str.replace(
        /(^( +|-+|\.+|\(+|\[+|\]+|\{+|\}+|\)+|_+)|( +|-+|\.+|\(+|\[+|\]+|\{+|\}+|\)+|_+)$)/gm,
        ""
    );

    cleanedString = cleanedString
        // "Mr.Bean's.Holiday" -> "Mr.Bean's Holiday"
        .replaceAll(/(?<!(dr|mr|mrs|ms|phd))\./gi, ' ')
        // "Mr.Bean's Holiday" -> "Mr. Bean's Holiday"
        .replaceAll(/(dr|mr|mrs|ms|phd)\./gi, '$1. ')
        .replaceAll("_", " ")
        .trim();
    // console.log(cleanedString)
    return cleanedString;
}
