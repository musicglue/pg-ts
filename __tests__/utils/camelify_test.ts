import camelify from "../../src/utils/camelify";

describe("Utils", () => {
  describe("Camelisation", () => {
    it("ignores strings", () => {
      expect(camelify("hello_world")).toEqual("hello_world");
    });

    it("ignores arrays", () => {
      const candidate = ["hello_world", "hello_world"];
      const result = camelify(candidate);
      expect(result).toBeInstanceOf(Array);
      expect(result).toEqual(candidate);
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
