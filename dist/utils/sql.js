"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLFragment = (parts, ...inValues) => (getValueIndex) => parts.reduce((prev, curr, valIdx) => `${prev}${getValueIndex(inValues[valIdx - 1])}${curr}`);
exports.SQL = (parts, ...inValues) => {
    const outValues = [];
    const getValueIndex = (value) => {
        if (value == null) {
            return `NULL`;
        }
        const found = outValues.indexOf(value);
        if (found > -1) {
            return `$${found + 1}`;
        }
        outValues.push(value);
        return `$${outValues.length}`;
    };
    const outText = parts.reduce((prev, curr) => {
        const value = inValues.shift();
        return typeof value === "function"
            ? `${prev}${value(getValueIndex)}${curr}`
            : `${prev}${getValueIndex(value)}${curr}`;
    });
    return { text: outText, values: outValues };
};
//# sourceMappingURL=sql.js.map