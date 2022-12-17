/**
 * Removes certain characters from the beginning and end of a string,
 * and replaces periods and underscores wtih spaces
 */
export function cleanString(str: string): string {
    let cleanedString = str.replace(
        /(^( +|-+|\.+|\(+|\[+|\]+|\{+|\}+|\)+|_+)|( +|-+|\.+|\(+|\[+|\]+|\{+|\}+|\)+|_+)$)/gm,
        ""
    );

    cleanedString = cleanedString.replaceAll(".", " ");
    cleanedString = cleanedString.replaceAll("_", " ");
    cleanedString = cleanedString.trim();
    // console.log(cleanedString)
    return cleanedString;
}
