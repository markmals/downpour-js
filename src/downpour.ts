import { cleanString } from "./utilities.js";

export type MediaType = "movie" | "tv";

/** Result of locating and decoding the season/episode region of a name. */
interface SeasonEpisode {
    season?: number;
    episode?: number;
    /** Start index in the raw string of the season/episode token, for title trimming. */
    index?: number;
    /** End index (exclusive) of the season/episode token. */
    end?: number;
}

/**
 * Resolution/codec/source tokens, matched globally on a word boundary. Used ONLY by
 * `title`: a movie with no year and no S/E marker is trimmed at the first tag, but only
 * when at least two tags cluster together — a lone word that merely collides with a tag
 * (e.g. "The Bluray Sunset") must not truncate the title.
 *
 * NOTE: this list does NOT gate season/episode detection — that is `CODE_EXCLUDE`'s job.
 */
const RELEASE_TAG =
    /(?:^|[^a-z0-9])(1080p|2160p|720p|480p|576p|360p|240p|bluray|brrip|bdrip|web-?dl|webrip|hdtv|hdrip|dvdrip|x264|x265|h264|h265|hevc|xvid|divx|aac|ac3|dts|remastered|repack)/gi;

/**
 * Bare 3-digit values that are resolutions/codecs, never a season+episode code. A trailing
 * "p" (e.g. 360p) is rejected separately by the matcher's lookahead, so this set only needs
 * the resolution/codec numbers that also appear without the "p".
 */
const CODE_EXCLUDE = new Set(["144", "240", "264", "265", "360", "480", "576", "720"]);

/** Earliest plausible release year. */
const MIN_YEAR = 1900;

/** Highest year we will accept — a small buffer past the current year for early releases. */
function maxYear(): number {
    return new Date().getFullYear() + 2;
}

export default class Downpour {
    private rawString: string;
    private _seasonEpisode?: SeasonEpisode;
    private _yearMatch?: { value: number; index: number } | null;

    public constructor(name: string) {
        this.rawString = name;
    }

    public toString(): string {
        return JSON.stringify(
            {
                title: this.title,
                episode: this.episode,
                season: this.season,
                year: this.year,
                type: this.type,
                basicPlexName: this.basicPlexName,
            },
            null,
            4
        );
    }

    /** The title of the media */
    public get title(): string {
        const se = this.seasonEpisode;
        const year = this.yearMatch;

        // Metadata spans to trim away. Only trim at a season/episode marker when the file
        // is actually TV — a stray "Episode"/3-digit token in a movie name must not cut it.
        const markers: Array<{ start: number; end: number }> = [];
        if (this.type === "tv" && se.index !== undefined && se.end !== undefined) {
            markers.push({ start: se.index, end: se.end });
        }
        if (year) markers.push({ start: year.index, end: year.index + 4 });

        // Year-less, marker-less movie: trim at a CLUSTER of release tags (>= 2) so a single
        // ordinary word that collides with a tag does not truncate the title.
        if (markers.length === 0) {
            const tags = [...this.rawString.matchAll(RELEASE_TAG)];
            if (tags.length >= 2) {
                const t = tags[0];
                const start = (t.index ?? 0) + t[0].length - t[1].length;
                if (start > 0) markers.push({ start, end: start + t[1].length });
            }
        }

        if (markers.length === 0) return cleanString(this.rawString);

        markers.sort((a, b) => a.start - b.start);

        // Prefer the text before the first marker.
        const before = cleanString(this.rawString.substring(0, markers[0].start));
        if (before) return before;

        // Marker leads the string: take the text after the last marker instead.
        const lastEnd = Math.max(...markers.map(m => m.end));
        const after = cleanString(this.rawString.substring(lastEnd));
        if (after) return after;

        // The string is nothing but metadata — there is no title.
        return "";
    }

    /** Located season/episode region (memoized — rawString is fixed at construction). */
    private get seasonEpisode(): SeasonEpisode {
        return (this._seasonEpisode ??= this.computeSeasonEpisode());
    }

    private computeSeasonEpisode(): SeasonEpisode {
        const s = this.rawString;
        // Build a result given a match whose trailing capture `token` is the S/E text.
        const span = (
            m: RegExpMatchArray,
            token: string,
            season: number,
            episode: number
        ): SeasonEpisode => {
            const index = (m.index ?? 0) + m[0].length - token.length;
            return { season, episode, index, end: index + token.length };
        };

        // S01E02 / S2005E01 / S01.E03 / s05e01 / S01E100 (anime absolute numbering)
        let m = s.match(/(?:^|[^a-z0-9])(s(\d{1,4})[\-\.\s_]?e(\d{1,3}))/i);
        if (m) return span(m, m[1], Number(m[2]), Number(m[3]));

        // "Season 2 Episode 5" (space/dot/underscore separated). Both labels are required,
        // adjacent, and anchored so "Preseason 2" / a lone "Season 3" do not match.
        m = s.match(/(?:^|[^a-z0-9])(season[\s._]+(\d{1,4})[\s._]+episode[\s._]+(\d{1,3}))/i);
        if (m) return span(m, m[1], Number(m[2]), Number(m[3]));

        // 1x02 — two numbers joined by an explicit `x`. Requiring `x` keeps dates,
        // audio tags ("5.1") and loose number pairs from being misread.
        m = s.match(/(?<![a-z0-9])((\d{1,2})x(\d{1,2}))(?![0-9])/i);
        if (m) return span(m, m[1], Number(m[2]), Number(m[3]));

        // Bare 3-digit code: 102 -> S01E02. Skip resolution/codec values and any NNNp token.
        for (const c of s.matchAll(/(?<![a-z0-9])(\d)(\d{2})(?![0-9p])/gi)) {
            if (CODE_EXCLUDE.has(c[1] + c[2])) continue;
            const index = c.index ?? 0;
            return { season: Number(c[1]), episode: Number(c[2]), index, end: index + 3 };
        }

        return {};
    }

    /**
     * The season number
     *
     * Not avaliable if `this.type` is `"movie"`
     */
    public get season(): number | undefined {
        return this.seasonEpisode.season;
    }

    /**
     * The episode number
     *
     * Not avaliable if `this.type` is `"movie"`
     */
    public get episode(): number | undefined {
        return this.seasonEpisode.episode;
    }

    /** The type of the media */
    public get type(): MediaType {
        const { season, episode } = this.seasonEpisode;
        // Definedness, not truthiness: season 0 (Plex "Specials") and episode 0 are valid.
        return season !== undefined && episode !== undefined ? "tv" : "movie";
    }

    /** Located release year (memoized): the last plausible delimited 4-digit token. */
    private get yearMatch(): { value: number; index: number } | undefined {
        if (this._yearMatch === undefined) this._yearMatch = this.computeYear() ?? null;
        return this._yearMatch ?? undefined;
    }

    private computeYear(): { value: number; index: number } | undefined {
        // Leading: start or a delimiter (incl. a dash, for `Title.YYYY-GROUP` scene names).
        // `(?<!season )` keeps a year-style SEASON number ("Season 2009") from also being
        // read as the release year. `(?!-\d{1,2}-\d)` rejects a YYYY-MM-DD date tail.
        const re =
            /(?:^|[\(\[._\s-])(?<!\bseason[\s._])(\d{4})(?![0-9])(?!-\d{1,2}-\d)(?=[\)\]._\s-]|$)/gi;
        const max = maxYear();
        let best: { value: number; index: number } | undefined;

        for (const m of this.rawString.matchAll(re)) {
            const value = Number(m[1]);
            if (value < MIN_YEAR || value > max) continue;
            best = { value, index: (m.index ?? 0) + m[0].length - m[1].length };
        }

        return best;
    }

    /** The year the movie or show premired */
    public get year(): number | undefined {
        return this.yearMatch?.value;
    }

    private format(number?: number): string | undefined {
        // Definedness, not truthiness, so 0 formats as "00" rather than vanishing.
        return number === undefined ? undefined : `${number}`.padStart(2, "0");
    }

    /**
     * The season, with at most one leading zero
     *
     * @example 01
     */
    public get formattedSeason(): string | undefined {
        return this.format(this.season);
    }

    /**
     * The episode, with at most one leading zero
     *
     * @example 05
     */
    public get formattedEpisode(): string | undefined {
        return this.format(this.episode);
    }

    /**
     * Both the season and the episode together
     *
     * @example "S##E##"
     */
    public get formattedSeasonEpisode(): string {
        let season = "";
        let episode = "";

        if (this.formattedSeason) season = `S${this.formattedSeason}`;
        if (this.formattedEpisode) episode = `E${this.formattedEpisode}`;

        return `${season}${episode}`;
    }

    /**
     * The basic name file name in the Plex Media Server
     *
     * More information on the [Plex Media Server file naming format](https://support.plex.tv/articles/200220687-naming-series-season-based-tv-shows/)
     * @example "Name (Year) - S##E##"
     */
    public get basicPlexName(): string {
        let yearDesc = "";
        if (this.year) yearDesc = ` (${this.year})`;

        switch (this.type) {
            case "tv":
                return `${this.title}${yearDesc} - ${this.formattedSeasonEpisode}`;
            case "movie":
                return `${this.title}${yearDesc}`;
        }
    }
}
