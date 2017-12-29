import camelify from "../../src/utils/camelify";

describe("Utils", () => {
  describe("Camelisation", () => {
    describe("Scalars pass through unaltered", () => {
      it("strings", () => expect(camelify("hello_world")).toEqual("hello_world"));
      it("numbers", () => expect(camelify(123)).toEqual(123));
      it("booleans", () => expect(camelify(false)).toEqual(false));
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
      expect(camelify(candidate)).toEqual({ helloWorld: "hi" });
    });

    it("does not stringify dates", () => {
      const date = new Date();
      expect(camelify({ date })).toEqual({ date });
    });
  });
});
