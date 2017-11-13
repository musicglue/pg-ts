import { SQL, SQLFragment } from "../../src/utils/sql";

describe("Utils", () => {
  describe("SQL utilities", () => {
    const variable = 10;
    const variable2 = 20;
    const variable3 = 30;
    let res: any;

    describe("for fragments", () => {
      const fragment = SQLFragment`SELECT * FROM example WHERE column = ${variable}`;

      beforeEach(() => {
        let i = 0;
        const seqGen = (value: any): string => {
          i++;
          return `$${i}`;
        };
        res = fragment(seqGen);
      });

      it("returns a function", () => {
        expect(fragment).toBeInstanceOf(Function);
      });

      it("which returns the interpolated string with bindings", () => {
        expect(res).toEqual("SELECT * FROM example WHERE column = $1");
      });

      it("does not return the variables interpolated", () => {
        expect(res).not.toEqual("SELECT * FROM example WHERE column = 10");
      });
    });

    describe("for statements", () => {
      describe("without interpolation", () => {
        beforeEach(() => {
          res = SQL`hello`;
        });

        it("returns a pg.QueryConfig", () => {
          expect(res).toBeInstanceOf(Object);
          expect(res).toHaveProperty("text", "hello");
          expect(res).toHaveProperty("values", []);
        });
      });

      describe("with simple interpolation", () => {
        beforeEach(() => {
          res = SQL`hello = ${variable}`;
        });

        it("returns a pg.QueryConfig bound and filled appropriately", () => {
          expect(res).toBeInstanceOf(Object);
          expect(res).toHaveProperty("text", "hello = $1");
          expect(res).toHaveProperty("values", [variable]);
        });
      });

      describe("with a single variable fragment", () => {
        beforeEach(() => {
          const frag = SQLFragment`hello ${variable}`;
          res = SQL`hello ${frag}`;
        });

        it("returns a pg.QueryConfig with inlined fragment and fragment variables", () => {
          expect(res).toBeInstanceOf(Object);
          expect(res).toHaveProperty("text", "hello hello $1");
          expect(res).toHaveProperty("values", [variable]);
        });
      });

      describe("with an interpolation and then a single variable fragment", () => {
        beforeEach(() => {
          const frag = SQLFragment`hello ${variable2}`;
          res = SQL`${variable} hello ${frag}`;
        });

        it("returns a pg.QueryConfig with inlined fragment and fragment variables", () => {
          expect(res).toBeInstanceOf(Object);
          expect(res).toHaveProperty("text", "$1 hello hello $2");
          expect(res).toHaveProperty("values", [variable, variable2]);
        });
      });

      describe("with an interpolation, a single variable fragment and then another interpolation", () => {
        beforeEach(() => {
          const frag = SQLFragment`hello ${variable2}`;
          res = SQL`${variable} hello ${frag} hello ${variable3}`;
        });

        it("returns a pg.QueryConfig with inlined fragment and fragment variables", () => {
          expect(res).toBeInstanceOf(Object);
          expect(res).toHaveProperty("text", "$1 hello hello $2 hello $3");
          expect(res).toHaveProperty("values", [variable, variable2, variable3]);
        });
      });
    });

    describe("deduplicating inputs", () => {
      describe("simple types", () => {
        [10, "10", 10.0, new Date()].forEach(value => {
          describe(`type deduplication for ${typeof value} ${value}`, () => {
            it("works", () => {
              res = SQL`${value} = ${value}`;
              expect(res).toHaveProperty("text", "$1 = $1");
              expect(res).toHaveProperty("values", [value]);
            });
          });
        });
      });

      describe("complex types", () => {
        describe("type deduplication for arrays", () => {
          let value: any;

          it("matches empty arrays", () => {
            value = [];
            res = SQL`${value} = ${value}`;
            expect(res).toHaveProperty("text", "$1 = $1");
            expect(res).toHaveProperty("values", [value]);
          });

          it("matches populated arrays", () => {
            value = [10];
            res = SQL`${value} = ${value}`;
            expect(res).toHaveProperty("text", "$1 = $1");
            expect(res).toHaveProperty("values", [value]);
          });

          it("matches nested arrays", () => {
            value = [[10]];
            res = SQL`${value} = ${value}`;
            expect(res).toHaveProperty("text", "$1 = $1");
            expect(res).toHaveProperty("values", [value]);
          });
        });

        describe("type deduplication for objects", () => {
          let value: any;

          it("matches empty objects", () => {
            value = {};
            res = SQL`${value} = ${value}`;
            expect(res).toHaveProperty("text", "$1 = $1");
            expect(res).toHaveProperty("values", [value]);
          });

          it("matches populated arrays", () => {
            value = {a: 10};
            res = SQL`${value} = ${value}`;
            expect(res).toHaveProperty("text", "$1 = $1");
            expect(res).toHaveProperty("values", [value]);
          });

          it("matches nested arrays", () => {
            value = {a: {b: 10}};
            res = SQL`${value} = ${value}`;
            expect(res).toHaveProperty("text", "$1 = $1");
            expect(res).toHaveProperty("values", [value]);
          });
        });
      });

      describe("more complex implementations", () => {
        it("supports alternating values", () => {
          res = SQL`${variable} = ${variable2}, ${variable} = ${variable3}`;
          expect(res).toHaveProperty("text", "$1 = $2, $1 = $3");
          expect(res).toHaveProperty("values", [variable, variable2, variable3]);
        });
      });
    });
  });
});
