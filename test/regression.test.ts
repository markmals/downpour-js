import { describe, expect, test } from "vitest";
import Downpour from "../src";
import { cleanString } from "../src/utilities";

/**
 * Regression coverage for the adversarial audit (2026-06).
 * Each block pins a previously-confirmed defect so it cannot silently return.
 * Finding numbers refer to the audit report.
 */
describe("regression: adversarial audit", () => {
    describe("[1] crash on space/dot-separated number pairs (was: TypeError)", () => {
        // Previously these threw `Cannot read properties of undefined (reading 'replace')`
        // from episode/type/title/basicPlexName/toString.
        const inputs = ["Cool Movie 19 84", "Show.Name.1.02.stuff", "Movie 12 31 X", "A B 7 7 C"];

        for (const input of inputs) {
            test(`"${input}" never throws and is treated as a movie`, () => {
                const d = new Downpour(input);
                expect(() => d.season).not.toThrow();
                expect(() => d.episode).not.toThrow();
                expect(() => d.type).not.toThrow();
                expect(() => d.title).not.toThrow();
                expect(() => d.basicPlexName).not.toThrow();
                expect(() => d.toString()).not.toThrow();
                expect(d.type).toEqual("movie");
                expect(d.season).toBeUndefined();
                expect(d.episode).toBeUndefined();
            });
        }
    });

    describe("[2] season 0 / episode 0 are TV, not movie", () => {
        test("S00 specials are classified as tv", () => {
            const d = new Downpour("Doctor.Who.S00E11.The.Snowmen");
            expect(d.type).toEqual("tv");
            expect(d.season).toEqual(0);
            expect(d.episode).toEqual(11);
            expect(d.title).toEqual("Doctor Who");
            expect(d.basicPlexName).toEqual("Doctor Who - S00E11");
        });

        test("episode 0 is classified as tv", () => {
            const d = new Downpour("Show.Name.S01E00");
            expect(d.type).toEqual("tv");
            expect(d.season).toEqual(1);
            expect(d.episode).toEqual(0);
            expect(d.basicPlexName).toEqual("Show Name - S01E00");
        });

        test("season 0 is classified as tv", () => {
            const d = new Downpour("Show.Name.S00E01");
            expect(d.type).toEqual("tv");
            expect(d.season).toEqual(0);
            expect(d.episode).toEqual(1);
            expect(d.basicPlexName).toEqual("Show Name - S00E01");
        });
    });

    describe('[3] "Season N Episode M" no longer returns NaN', () => {
        test("space separated", () => {
            const d = new Downpour("Show Name Season 2 Episode 5");
            expect(d.season).toEqual(2);
            expect(d.episode).toEqual(5);
            expect(d.type).toEqual("tv");
            expect(d.basicPlexName).toEqual("Show Name - S02E05");
        });

        test("dot separated", () => {
            const d = new Downpour("Show.Name.Season.2.Episode.5");
            expect(d.season).toEqual(2);
            expect(d.episode).toEqual(5);
            expect(d.type).toEqual("tv");
        });

        test('"Season N" alone (no episode) is not classified as TV', () => {
            // A season pack with no episode stays a movie so season/episode never
            // contradict `type` (review: type-vs-season/episode contract).
            const d = new Downpour("Show Name Season 3");
            expect(d.type).toEqual("movie");
            expect(d.season).toBeUndefined();
            expect(d.episode).toBeUndefined();
        });
    });

    describe("[4] 3-digit codes decode season and episode separately", () => {
        test('"123" -> S01E23 (not S02E02)', () => {
            const d = new Downpour("Show Name 123 Stuff");
            expect(d.season).toEqual(1);
            expect(d.episode).toEqual(23);
            expect(d.type).toEqual("tv");
            expect(d.basicPlexName).toEqual("Show Name - S01E23");
        });

        test('"102" -> S01E02 and stays tv', () => {
            const d = new Downpour("Show.Name.102.x264");
            expect(d.season).toEqual(1);
            expect(d.episode).toEqual(2);
            expect(d.type).toEqual("tv");
        });
    });

    describe("[5] codec/resolution tokens are not season/episode", () => {
        for (const input of ["Movie.264.h264", "Movie.720.x264"]) {
            test(`"${input}" is a movie`, () => {
                const d = new Downpour(input);
                expect(d.type).toEqual("movie");
                expect(d.season).toBeUndefined();
                expect(d.episode).toBeUndefined();
            });
        }

        test("standalone .480. resolution is not an episode", () => {
            const d = new Downpour("Movie.Name.2013.480.BluRay.mp4");
            expect(d.type).toEqual("movie");
            expect(d.year).toEqual(2013);
            expect(d.basicPlexName).toEqual("Movie Name (2013)");
        });
    });

    describe("[6] dash-delimited dates are not season/episode", () => {
        test("YYYY-MM-DD date keeps the file a movie", () => {
            const d = new Downpour("Movie 2009-12-20 thing.mkv");
            expect(d.type).toEqual("movie");
            expect(d.season).toBeUndefined();
            expect(d.episode).toBeUndefined();
        });
    });

    describe("[7] year is bounded and picks the real release year", () => {
        const max = new Date().getFullYear() + 2;

        test("impossible far-future year is rejected", () => {
            expect(new Downpour("Show 4000 Days.mkv").year).toBeUndefined();
            expect(new Downpour("Movie 9912 thing").year).toBeUndefined();
        });

        test("a title number is not mistaken for the year", () => {
            const d = new Downpour("Blade Runner 2049 2017.mkv");
            expect(d.year).toEqual(2017);
        });

        test("plausible years are accepted", () => {
            expect(new Downpour("Old Film 1999").year).toEqual(1999);
        });

        test(`year guard is exactly current year + 2 (${max})`, () => {
            // At the boundary: accepted. One past the boundary: rejected.
            expect(new Downpour(`Movie ${max} Edition`).year).toEqual(max);
            expect(new Downpour(`Movie ${max + 1} Edition`).year).toBeUndefined();
        });
    });

    describe("[8] honorific handling does not corrupt ordinary words", () => {
        test("words ending in honorific letters keep no stray period", () => {
            expect(cleanString("Films.Of.2020")).toEqual("Films Of 2020");
            expect(cleanString("Atoms.For.Peace")).toEqual("Atoms For Peace");
            expect(cleanString("Programs.Guide")).toEqual("Programs Guide");
        });

        test('"Atoms.For.Peace.S01E02" keeps a clean title', () => {
            const d = new Downpour("Atoms.For.Peace.S01E02");
            expect(d.title).toEqual("Atoms For Peace");
            expect(d.basicPlexName).toEqual("Atoms For Peace - S01E02");
        });
    });

    describe("[9] a no-year movie title drops release/codec tags", () => {
        test("title is the leading portion, not the whole filename", () => {
            const d = new Downpour("The.Matrix.REMASTERED.1080p.BluRay.x264-GROUP");
            expect(d.title).toEqual("The Matrix");
            expect(d.title).not.toMatch(/1080p|bluray|x264/i);
        });

        test("another release name", () => {
            const d = new Downpour("Inception.1080p.BluRay.x264-SPARKS");
            expect(d.title).toEqual("Inception");
        });
    });

    describe("[10] stray ?/: in the year class no longer yields NaN", () => {
        for (const input of ["Movie?2013.mp4", "Movie:2013.mp4"]) {
            test(`"${input}" -> year is undefined, never NaN`, () => {
                const d = new Downpour(input);
                expect(d.year).toBeUndefined();
                expect(Number.isNaN(d.year as unknown as number)).toBe(false);
            });
        }
    });

    describe("[11] title is not truncated by an earlier copy of the year digits", () => {
        test("embedded year digits do not cut the title short", () => {
            const d = new Downpour("Apollo1984Mission.1984.1080p.BluRay.mp4");
            expect(d.year).toEqual(1984);
            expect(d.title).toEqual("Apollo1984Mission");
        });
    });

    describe("[12] format() preserves 0 as 00", () => {
        test("S00E00 formats fully", () => {
            const d = new Downpour("Show.Name.S00E00");
            expect(d.formattedSeason).toEqual("00");
            expect(d.formattedEpisode).toEqual("00");
            expect(d.formattedSeasonEpisode).toEqual("S00E00");
            expect(d.basicPlexName).toEqual("Show Name - S00E00");
        });
    });

    describe("[13] SxxExx embedded in a word is not a season/episode marker", () => {
        for (const input of ["Diseases01e02.mkv", "Glasses01E02.mkv"]) {
            test(`"${input}" is not mis-parsed and the title is intact`, () => {
                const d = new Downpour(input);
                expect(d.type).toEqual("movie");
                expect(d.season).toBeUndefined();
                expect(d.title).toMatch(/^Diseases|^Glasses/);
            });
        }
    });

    describe("[14]/[15] cleanString trims and collapses cleanly", () => {
        test("mixed leading/trailing delimiters are fully stripped", () => {
            expect(cleanString("-(foo)-")).toEqual("foo");
            expect(cleanString("][foo][")).toEqual("foo");
        });

        test("release-group bracket prefix leaves no stray bracket", () => {
            const d = new Downpour("[HorribleSubs] Show Name - S01E02 [720p].mkv");
            expect(d.title).toEqual("HorribleSubs Show Name");
            expect(d.title).not.toContain("]");
        });

        test("adjacent underscore + period does not leave a double space", () => {
            expect(cleanString("foo_.bar")).toEqual("foo bar");
            const d = new Downpour("Mr._Bean.S01E02");
            expect(d.title).toEqual("Mr. Bean");
            expect(d.title).not.toContain("  ");
        });
    });

    describe("degenerate inputs never throw", () => {
        for (const input of ["", ".", "   ", "....", "----", "____", "[]", "S", "E01"]) {
            test(`${JSON.stringify(input)} is handled safely`, () => {
                const d = new Downpour(input);
                expect(() => d.toString()).not.toThrow();
                expect(() => d.basicPlexName).not.toThrow();
                expect(d.type).toEqual("movie");
            });
        }
    });

    describe("cleanString tolerates non-string input", () => {
        test("undefined does not throw", () => {
            expect(() => cleanString(undefined as unknown as string)).not.toThrow();
            expect(cleanString(undefined as unknown as string)).toEqual("");
        });
    });
});

/**
 * Regression coverage for the xhigh code review of the audit fixes.
 * These pin defects the review found in the first round of fixes.
 */
describe("regression: code review (xhigh)", () => {
    describe("[R1] year accepts a trailing dash but still rejects dates", () => {
        test("scene-release Title.YYYY-GROUP / -tag", () => {
            expect(new Downpour("Some.Movie.2015-GROUP").year).toEqual(2015);
            expect(new Downpour("Movie-2009-BluRay").year).toEqual(2009);
            expect(new Downpour("Inception.2010-720p").year).toEqual(2010);
        });

        test("a YYYY-MM-DD date is still not a year", () => {
            expect(new Downpour("Show Name - S06E01 - 2009-12-20 - Ep Name").year).toBeUndefined();
        });
    });

    describe("[R2] a movie with the word Season/Episode keeps its full title", () => {
        test("Episode word mid-title is not a cut point for a movie", () => {
            const d = new Downpour("Documentary Episode 50 Years Later 2020");
            expect(d.type).toEqual("movie");
            expect(d.title).toEqual("Documentary Episode 50 Years Later");
            expect(d.year).toEqual(2020);
        });

        test("Season word mid-title is not a cut point for a movie", () => {
            const d = new Downpour("Monster Season 2 The Sequel");
            expect(d.type).toEqual("movie");
            expect(d.title).toEqual("Monster Season 2 The Sequel");
        });
    });

    describe("[R3] resolution tiers are not season/episode", () => {
        test("NNNp resolutions stay movies", () => {
            expect(new Downpour("Movie.360p.thing").type).toEqual("movie");
            const d = new Downpour("Movie.Name.2013.240p.mp4");
            expect(d.type).toEqual("movie");
            expect(d.year).toEqual(2013);
        });

        test("bare resolution number with a real year stays a movie", () => {
            const d = new Downpour("Some.Movie.2018.360.mp4");
            expect(d.type).toEqual("movie");
            expect(d.year).toEqual(2018);
        });
    });

    describe("[R4] a season/episode marker at the start does not leak into the title", () => {
        test("text after a leading marker becomes the title", () => {
            const d = new Downpour("S01E02 Show");
            expect(d.title).toEqual("Show");
            expect(d.basicPlexName).toEqual("Show - S01E02");
        });

        test("a pure-metadata name yields an empty title, not a duplicate", () => {
            const d = new Downpour("S01E02");
            expect(d.title).toEqual("");
            expect(d.basicPlexName).toEqual(" - S01E02");
            expect(d.basicPlexName).not.toContain("S01E02 S01E02");
        });
    });

    describe("[R5] 3+-digit episode/season with an explicit marker is not truncated", () => {
        test("S01E100 keeps the full episode number", () => {
            const d = new Downpour("Show.S01E100.mkv");
            expect(d.season).toEqual(1);
            expect(d.episode).toEqual(100);
            expect(d.formattedEpisode).toEqual("100");
            expect(d.basicPlexName).toEqual("Show - S01E100");
        });
    });

    describe("[R6] single Season/Episode label does not violate the type contract", () => {
        test('"Episode N" alone is a movie with no episode exposed', () => {
            const d = new Downpour("Planet Earth Episode 1");
            expect(d.type).toEqual("movie");
            expect(d.episode).toBeUndefined();
            expect(d.formattedSeasonEpisode).toEqual("");
        });
    });

    describe("[R7] Season/Episode embedded in a larger word does not match", () => {
        test('"Preseason"/"Postseason" are not "Season"', () => {
            expect(new Downpour("Preseason 2 Special").season).toBeUndefined();
            expect(new Downpour("Preseason 2 Special").title).toEqual("Preseason 2 Special");
            expect(new Downpour("Postseason.3.Recap").season).toBeUndefined();
        });
    });

    describe("[R8] far-apart Season and Episode tokens are not fused", () => {
        for (const input of [
            "Season 1 blah blah Episode 12 finale",
            "Special Episode 5 Then Season 2",
        ]) {
            test(`"${input}" is not classified tv`, () => {
                expect(new Downpour(input).type).toEqual("movie");
            });
        }
    });

    describe("[R9] a year-style season is not double-counted as the release year", () => {
        test('"Season 2009" is the season, not also the year', () => {
            const d = new Downpour("Show Season 2009 Episode 5");
            expect(d.season).toEqual(2009);
            expect(d.episode).toEqual(5);
            expect(d.year).toBeUndefined();
            expect(d.basicPlexName).toEqual("Show - S2009E05");
        });
    });

    describe("[R10] a lone release-tag-like word does not truncate the title", () => {
        test("single tag-like word is kept", () => {
            expect(new Downpour("The Bluray Sunset").title).toEqual("The Bluray Sunset");
            expect(new Downpour("The Remastered Symphony").title).toEqual("The Remastered Symphony");
        });

        test("a cluster of real tags is still trimmed", () => {
            const d = new Downpour("The.Matrix.REMASTERED.1080p.BluRay.x264-GROUP");
            expect(d.title).toEqual("The Matrix");
        });
    });

    describe("[R14] year bound is governed by maxYear(), not the regex prefix", () => {
        const max = new Date().getFullYear() + 2;
        test("21xx is reachable in principle and bounded by maxYear()", () => {
            // Far-future years are rejected by the numeric bound, not silently by a 19|20 prefix.
            expect(new Downpour(`Movie ${max + 1} Edition`).year).toBeUndefined();
            expect(new Downpour(`Movie ${max} Edition`).year).toEqual(max);
            // Sub-1900 four-digit numbers are rejected too.
            expect(new Downpour("Movie 1234 thing").year).toBeUndefined();
        });
    });
});
