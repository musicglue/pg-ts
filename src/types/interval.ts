type PGIntervalField = "seconds" | "minutes" | "hours" | "days" | "months" | "years";
interface PGIntervalObject<T> {
  [key: string]: T;
  milliseconds?: T;
  seconds?: T;
  minutes?: T;
  hours?: T;
  days?: T;
  months?: T;
  years?: T;
}

const NEGATION_INDEX = 8;
const NEGATION_INDICATOR = "-";

const NUMBER = "([+-]?\\d+)";
const YEAR = NUMBER + "\\s+years?";
const MONTH = NUMBER + "\\s+mons?";
const DAY = NUMBER + "\\s+days?";
const TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\.?(\\d{1,6})?";
const INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(regexString => `(${regexString})?`).join("\\s*"));

const propMapToISO: PGIntervalObject<string> = {
  days: "D",
  hours: "H",
  minutes: "M",
  months: "M",
  seconds: "S",
  years: "Y",
};

const positionLookup: PGIntervalObject<number> = {
  days: 6,
  hours: 9,
  milliseconds: 12,
  minutes: 10,
  months: 4,
  seconds: 11,
  years: 2,
};

const dateProps: PGIntervalField[] = ["years", "months", "days"];
const timeProps: PGIntervalField[] = ["hours", "minutes", "seconds"];

// pad sub-seconds up to microseconds before parsing
const parseSubseconds = (fraction: string): number =>
  parseInt(`${fraction}${"000000".slice(fraction.length)}`, 10);

const parse = (raw: string): PGIntervalObject<number> => {
  if (!raw) { return null; }

  const matches = INTERVAL.exec(raw);
  const isNegative = matches[NEGATION_INDEX] === NEGATION_INDICATOR;

  return Object
    .keys(positionLookup)
    .reduce((acc, prop: PGIntervalField) => {
      const position = positionLookup[prop];
      const value = matches[position];
      if (!value) { return acc; }

      const parsed = String(prop) === "milliseconds"
        ? parseSubseconds(value)
        : parseInt(value, 10);

      if (!parsed) { return acc; }

      return {
        ...acc,
        [prop]: (isNegative && timeProps.includes(prop)) ? parsed * -1 : parsed,
      };
    }, {});
};

const formatMilliseconds = (raw: number): string =>
  String(raw * 1000).replace(/[0]+$/g, "");

const buildProperty = (parsed: PGIntervalObject<number>) => (prop: PGIntervalField): string => {
  const value = parsed[prop] || 0;
  const isoEquiv = propMapToISO[prop];

  if (prop === "seconds" && parsed.milliseconds) {
    return `${value}.${formatMilliseconds(parsed.milliseconds)}${isoEquiv}`;
  }

  return `${value}${isoEquiv}`;
};

export default (raw: string): string => {
  const parsed = parse(raw);
  const datePart = dateProps.map(buildProperty(parsed)).join("");
  const timePart = timeProps.map(buildProperty(parsed)).join("");

  return `P${datePart}T${timePart}`;
};
