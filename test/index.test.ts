import { describe, expect, test } from "vitest";
import Downpour from "../src";
import { cleanString } from '../src/utilities';

describe("movies", () => {
    describe("given a name with periods", () => {
        let metadata = new Downpour("Movie.Name.2013.1080p.BluRay.H264.AAC.mp4");

        test("correct metadata extracted", () => {
            expect(metadata.title).toEqual("Movie Name");
            expect(metadata.year).toEqual(2013);
            expect(metadata.resolution).toEqual("1080p");
            expect(metadata.basicPlexName).toEqual("Movie Name (2013)");
        });

        test("correctly identified as a movie", () => {
            expect(metadata.type).toEqual("movie");
            expect(metadata.season).toBeUndefined();
            expect(metadata.episode).toBeUndefined();
        });
    });

    describe("given a name with underscores", () => {
        let metadata = new Downpour("Movie_Name_2_2017_x264_RARBG.avi");

        test("correct metadata extracted", () => {
            expect(metadata.title).toEqual("Movie Name 2");
            expect(metadata.year).toEqual(2017);
            expect(metadata.basicPlexName).toEqual("Movie Name 2 (2017)");
        });

        test("correctly identified as a movie", () => {
            expect(metadata.type).toEqual("movie");
            expect(metadata.season).toBeUndefined();
            expect(metadata.episode).toBeUndefined();
        });
    });
});

describe("tv shows", () => {
    describe("given a name with periods", () => {
        let metadata = new Downpour("Show.Name.S01E02");

        test("correct metadata extracted", () => {
            expect(metadata.title).toEqual("Show Name");
            expect(metadata.season).toEqual(1);
            expect(metadata.episode).toEqual(2);
            expect(metadata.basicPlexName).toEqual("Show Name - S01E02");
            expect(metadata.formattedSeason).toEqual("01");
            expect(metadata.formattedEpisode).toEqual("02");
            expect(metadata.formattedSeasonEpisode).toEqual("S01E02");
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
            expect(metadata.year).toBeUndefined();
        });
    });

    describe("given a name with an episode title", () => {
        let metadata = new Downpour("Rick.and.Morty.S06E05.Final.DeSmithation.1080p.HMAX.WEB-DL.DD5.1.x264-NTb");

        test("correct metadata extracted", () => {
            expect(metadata.resolution).toEqual("1080p");
            expect(metadata.title).toEqual("Rick and Morty");
            expect(metadata.season).toEqual(6);
            expect(metadata.episode).toEqual(5);
            expect(metadata.basicPlexName).toEqual("Rick and Morty - S06E05");
            expect(metadata.formattedSeason).toEqual("06");
            expect(metadata.formattedEpisode).toEqual("05");
            expect(metadata.formattedSeasonEpisode).toEqual("S06E05");
        });

        test("episode name extracted", () => {
            expect(metadata.episodeTitle).toEqual("Final DeSmithation");
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
            expect(metadata.year).toBeUndefined();
        });
    });

    describe("given a show with an honorific in the title", () => {
        let metadata = new Downpour("Mr.Show.Name.S01E02.Source.Quality.Etc-Group");

        test("correct metadata extracted", () => {
            expect(metadata.season).toEqual(1);
            expect(metadata.episode).toEqual(2);
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
            expect(metadata.year).toBeUndefined();
        });

        test("preserves the period for honorifics in the title", () => {
            expect(metadata.title).toEqual("Mr. Show Name");
            expect(metadata.basicPlexName).toEqual("Mr. Show Name - S01E02");
        });

        test("correctly parse out periods preserving Mr./Mrs./etc", () => {
            expect(cleanString("Mr.and.Mrs.Smith")).toEqual("Mr. and Mrs. Smith");
            expect(cleanString("Mr.Bean's.Holiday")).toEqual("Mr. Bean's Holiday");
        });
    });

    describe("given an already correctly formatted name", () => {
        let metadata = new Downpour("Show Name - S01E02 - My Ep Name");

        test("correct metadata extracted", () => {
            expect(metadata.title).toEqual("Show Name");
            expect(metadata.season).toEqual(1);
            expect(metadata.episode).toEqual(2);
            expect(metadata.basicPlexName).toEqual("Show Name - S01E02");
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
            expect(metadata.year).toBeUndefined();
        });
    });

    describe("given a show with a floating point number in the title", () => {
        let metadata = new Downpour("Show.2.0.Name.S01.E03.My.Ep.Name-Group");

        test("correct metadata extracted", () => {
            expect(metadata.season).toEqual(1);
            expect(metadata.episode).toEqual(3);
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
            expect(metadata.year).toBeUndefined();
        });

        // test("preserves the period for floating point numbers in the title", () => {
        //     expect(metadata.title).toEqual("Show 2.0 Name");
        //     expect(metadata.basicPlexName).toEqual("Show 2.0 Name - S01E03");
        // });
    });

    describe("given a name with a dash-deliminated date", () => {
        let metadata = new Downpour("Show Name - S06E01 - 2009-12-20 - Ep Name");

        test("correct metadata extracted", () => {
            expect(metadata.title).toEqual("Show Name");
            expect(metadata.season).toEqual(6);
            expect(metadata.episode).toEqual(1);
            expect(metadata.basicPlexName).toEqual("Show Name - S06E01");
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
            expect(metadata.year).toBeUndefined();
        });
    });

    describe("given a name with extra dashes", () => {
        let spaceDashes = new Downpour("Show Name - S06E01 - -30-");

        test("correct metadata extracted", () => {
            expect(spaceDashes.title).toEqual("Show Name");
            expect(spaceDashes.season).toEqual(6);
            expect(spaceDashes.episode).toEqual(1);
            expect(spaceDashes.basicPlexName).toEqual("Show Name - S06E01");
        });

        test("correctly identified as a tv show", () => {
            expect(spaceDashes.type).toEqual("tv");
            expect(spaceDashes.year).toBeUndefined();
        });

        let extraDash = new Downpour("Show.Name.S06E01.Other.WEB-DL");

        test("correct metadata extracted", () => {
            expect(extraDash.title).toEqual("Show Name");
            expect(extraDash.season).toEqual(6);
            expect(extraDash.episode).toEqual(1);
            expect(extraDash.basicPlexName).toEqual("Show Name - S06E01");
        });

        test("correctly identified as a tv show", () => {
            expect(extraDash.type).toEqual("tv");
            expect(extraDash.year).toBeUndefined();
        });
    });

    describe("given a name with spaces instead of dashes", () => {
        let metadata = new Downpour("Show.Name.S06E01 Some-Stuff Here");

        test("correct metadata extracted", () => {
            expect(metadata.title).toEqual("Show Name");
            expect(metadata.season).toEqual(6);
            expect(metadata.episode).toEqual(1);
            expect(metadata.basicPlexName).toEqual("Show Name - S06E01");
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
            expect(metadata.year).toBeUndefined();
        });
    });

    describe("given a name with a dash in the title", () => {
        let metadata = new Downpour("Show.Name-0.2010.S01E02.Source.Quality.Etc-Group");

        test("correct metadata extracted", () => {
            expect(metadata.season).toEqual(1);
            expect(metadata.episode).toEqual(2);
            expect(metadata.basicPlexName).toEqual("Show Name-0 (2010) - S01E02");
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
        });

        test("extracted the year for a tv show", () => {
            expect(metadata.year).toEqual(2010);
        });

        test("preserved the dash in the title", () => {
            expect(metadata.title).toEqual("Show Name-0");
        });
    });

    describe("given a name with the resolution", () => {
        let metadata = new Downpour("Show-Name-S06E01-720p");

        test("correct metadata extracted", () => {
            expect(metadata.title).toEqual("Show-Name");
            expect(metadata.season).toEqual(6);
            expect(metadata.episode).toEqual(1);
            expect(metadata.basicPlexName).toEqual("Show-Name - S06E01");
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
            expect(metadata.year).toBeUndefined();
        });
    });

    describe("given a name with a year for the season", () => {
        let metadata = new Downpour("Show Name - s2005e01");

        test("correct metadata extracted", () => {
            expect(metadata.title).toEqual("Show Name");
            expect(metadata.season).toEqual(2005);
            expect(metadata.episode).toEqual(1);
            expect(metadata.basicPlexName).toEqual("Show Name - S2005E01");
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
        });
    });

    describe("given a name with lowercase s and e", () => {
        let metadata = new Downpour("Show Name - s05e01");

        test("correct metadata extracted", () => {
            expect(metadata.title).toEqual("Show Name");
            expect(metadata.season).toEqual(5);
            expect(metadata.episode).toEqual(1);
            expect(metadata.basicPlexName).toEqual("Show Name - S05E01");
        });

        test("correctly identified as a tv show", () => {
            expect(metadata.type).toEqual("tv");
            expect(metadata.year).toBeUndefined();
        });
    });

    describe("season and episode deliminated by an 'x'", () => {
        describe("given periods and extra information", () => {
            let metadata = new Downpour("Show_Name.1x02.Source_Quality_Etc-Group");

            test("correct metadata extracted", () => {
                expect(metadata.title).toEqual("Show Name");
                expect(metadata.season).toEqual(1);
                expect(metadata.episode).toEqual(2);
                expect(metadata.basicPlexName).toEqual("Show Name - S01E02");
            });

            test("correctly identified as a tv show", () => {
                expect(metadata.type).toEqual("tv");
                expect(metadata.year).toBeUndefined();
            });
        });

        describe("given a space between the title and season x episode", () => {
            let metadata = new Downpour("Show Name 1x02");

            test("correct metadata extracted", () => {
                expect(metadata.title).toEqual("Show Name");
                expect(metadata.season).toEqual(1);
                expect(metadata.episode).toEqual(2);
                expect(metadata.basicPlexName).toEqual("Show Name - S01E02");
            });

            test("correctly identified as a tv show", () => {
                expect(metadata.type).toEqual("tv");
                expect(metadata.year).toBeUndefined();
            });
        });

        describe("given the codec (x264) in the name as well as the season x episode", () => {
            let metadata = new Downpour("Show Name 1x02 x264 Test");

            test("correct metadata extracted", () => {
                expect(metadata.title).toEqual("Show Name");
                expect(metadata.season).toEqual(1);
                expect(metadata.episode).toEqual(2);
                expect(metadata.basicPlexName).toEqual("Show Name - S01E02");
            });

            test("correctly identified as a tv show", () => {
                expect(metadata.type).toEqual("tv");
                expect(metadata.year).toBeUndefined();
            });
        });

        describe("given a name with dashes", () => {
            let metadata = new Downpour("Show Name - 1x02 - My Ep Name");

            test("correct metadata extracted", () => {
                expect(metadata.title).toEqual("Show Name");
                expect(metadata.season).toEqual(1);
                expect(metadata.episode).toEqual(2);
                expect(metadata.basicPlexName).toEqual("Show Name - S01E02");
            });

            test("correctly identified as a tv show", () => {
                expect(metadata.type).toEqual("tv");
                expect(metadata.year).toBeUndefined();
            });
        });
    });
});
