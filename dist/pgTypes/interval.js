"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NEGATION_INDEX = 8;
const NEGATION_INDICATOR = "-";
const NUMBER = "([+-]?\\d+)";
const YEAR = NUMBER + "\\s+years?";
const MONTH = NUMBER + "\\s+mons?";
const DAY = NUMBER + "\\s+days?";
const TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d).?(\\d{1,6})?";
const INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(regexString => `(${regexString})?`).join("\\s*"));
const propMapToISO = {
    days: "D",
    hours: "H",
    milliseconds: undefined,
    minutes: "M",
    months: "M",
    seconds: "S",
    years: "Y",
};
const positionLookup = {
    days: 6,
    hours: 9,
    milliseconds: 12,
    minutes: 10,
    months: 4,
    seconds: 11,
    years: 2,
};
const dateProps = ["years", "months", "days"];
const timeProps = ["hours", "minutes", "seconds"];
// pad sub-seconds up to microseconds before parsing
const parseSubseconds = (fraction) => parseInt(`${fraction}${"000000".slice(fraction.length)}`, 10);
const parse = (raw) => {
    if (!raw) {
        return null;
    }
    const matches = INTERVAL.exec(raw);
    if (!matches) {
        return null;
    }
    const isNegative = matches[NEGATION_INDEX] === NEGATION_INDICATOR;
    return Object.keys(positionLookup).reduce((acc, prop) => {
        const position = positionLookup[prop];
        if (!position) {
            return acc;
        }
        const value = matches[position];
        if (!value) {
            return acc;
        }
        const parsed = String(prop) === "milliseconds" ? parseSubseconds(value) : parseInt(value, 10);
        if (!parsed) {
            return acc;
        }
        return Object.assign({}, acc, { [prop]: isNegative && timeProps.includes(prop) ? parsed * -1 : parsed });
    }, {});
};
const formatMilliseconds = (raw) => String(raw * 1000).replace(/[0]+$/g, "");
const buildProperty = (parsed) => (prop) => {
    const value = parsed == null ? 0 : parsed[prop] || 0;
    const isoEquiv = propMapToISO[prop];
    if (prop === "seconds" && parsed && parsed.milliseconds) {
        return `${value}.${formatMilliseconds(parsed.milliseconds)}${isoEquiv}`;
    }
    return `${value}${isoEquiv}`;
};
exports.parseInterval = (raw) => {
    const parsed = parse(raw);
    const datePart = dateProps.map(buildProperty(parsed)).join("");
    const timePart = timeProps.map(buildProperty(parsed)).join("");
    return `P${datePart}T${timePart}`;
};
//# sourceMappingURL=interval.js.map