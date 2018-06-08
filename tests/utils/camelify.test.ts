import { camelCase, constant } from "lodash";
import { defaultCamelCaser as camelify, makeCamelCaser } from "../../src/utils/camelify";

describe("Utils", () => {
  describe("Camelisation", () => {
    describe("Scalars pass through unaltered", () => {
      it("strings", () => expect(camelify(["hello_world"])).toEqual(["hello_world"]));
      it("numbers", () => expect(camelify([123])).toEqual([123]));
      it("booleans", () => expect(camelify([false])).toEqual([false]));
    });

    describe("Array keys are unaltered", () => {
      it("does not alter array keys", () => {
        const candidate = ["hello_world", "hello_world"];
        const result = camelify(candidate);
        expect(result).toBeInstanceOf(Array);
        expect(result).toEqual(candidate);
      });

      it("does not alter nested array keys", () => {
        const candidate = [["beep", ["boop"]], ["this", "that"]];
        expect(camelify(candidate)).toEqual(candidate);
      });

      it("camelcases objects in arrays", () =>
        expect(camelify([{ beep_boop: "beepBoop" }])).toEqual([{ beepBoop: "beepBoop" }]));

      it("camelcases objects in nested arrays", () =>
        expect(
          camelify([[{ this_that: "thisThat" }, { beep_boop: [{ beep_bzzt: "beepBzzt" }] }]]),
        ).toEqual([[{ thisThat: "thisThat" }, { beepBoop: [{ beepBzzt: "beepBzzt" }] }]]));
    });

    it("camelises simple objects", () => {
      const candidate = { hello_world: "hi" };
      expect(camelify([candidate])).toEqual([{ helloWorld: "hi" }]);
    });

    it("does not stringify dates", () => {
      const date = new Date();
      expect(camelify([{ date }])).toEqual([{ date }]);
    });

    describe("Configurable exclude list", () => {
      it("ignores underscore prefixed fields by default", () =>
        expect(camelify([{ __hello_world: "Hello World" }])).toEqual([
          {
            __hello_world: "Hello World",
          },
        ]));

      it("takes a predicate function for exclusion", () => {
        const camelifyAll = makeCamelCaser({ exclude: constant(false) });

        expect(camelifyAll([{ __hello_world: "Hello World" }])).toEqual([
          {
            helloWorld: "Hello World",
          },
        ]);
      });

      it("takes a keyMapper function", () => {
        const underscorePreservingCamelCase = (k: string) => {
          const matches = k.match(/^(_*)?(.*?)(_*)?$/);
          if (matches == null) {
            return k;
          }
          const [, prefix = "", middle, suffix = ""] = matches;
          return `${prefix}${camelCase(middle)}${suffix}`;
        };

        const camelifyAll = makeCamelCaser({
          exclude: constant(false),
          keyMapper: underscorePreservingCamelCase,
        });

        expect(camelifyAll([{ __hello_world: "Hello World" }])).toEqual([
          {
            __helloWorld: "Hello World",
          },
        ]);
        expect(camelifyAll([{ hello_world__: "Hello World" }])).toEqual([
          {
            helloWorld__: "Hello World",
          },
        ]);
        expect(camelifyAll([{ __hello_world__: "Hello World" }])).toEqual([
          {
            __helloWorld__: "Hello World",
          },
        ]);
      });
    });
  });
});
