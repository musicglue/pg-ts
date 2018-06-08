interface PGNamedIntervalObject<T> {
  milliseconds: T | undefined;
  seconds: T | undefined;
  minutes: T | undefined;
  hours: T | undefined;
  days: T | undefined;
  months: T | undefined;
  years: T | undefined;
}

type PGIntervalField = keyof PGNamedIntervalObject<any>;

interface PGIntervalObject<T> extends Record<string, T | undefined>, PGNamedIntervalObject<T> {}

const NEGATION_INDEX = 8;
const NEGATION_INDICATOR = "-";

const NUMBER = "([+-]?\\d+)";
const YEAR = NUMBER + "\\s+years?";
const MONTH = NUMBER + "\\s+mons?";
const DAY = NUMBER + "\\s+days?";
const TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d).?(\\d{1,6})?";
const INTERVAL = new RegExp(
  [YEAR, MONTH, DAY, TIME].map(regexString => `(${regexString})?`).join("\\s*"),
);

const propMapToISO: PGIntervalObject<string> = {
  days: "D",
  hours: "H",
  milliseconds: undefined,
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

const dateProps: string[] = ["years", "months", "days"];
const timeProps: string[] = ["hours", "minutes", "seconds"];

// pad sub-seconds up to microseconds before parsing
const parseSubseconds = (fraction: string): number =>
  parseInt(`${fraction}${"000000".slice(fraction.length)}`, 10);

const parse = (raw: string): PGIntervalObject<number> | null => {
  if (!raw) {
    return null;
  }

  const matches = INTERVAL.exec(raw);

  if (!matches) {
    return null;
  }

  const isNegative = matches[NEGATION_INDEX] === NEGATION_INDICATOR;

  return Object.keys(positionLookup).reduce(
    (acc, prop: string) => {
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

      return {
        ...acc,
        [prop]: isNegative && timeProps.includes(prop) ? parsed * -1 : parsed,
      };
    },
    {} as PGIntervalObject<number>,
  );
};

const formatMilliseconds = (raw: number): string => String(raw * 1000).replace(/[0]+$/g, "");

const buildProperty = (parsed: PGIntervalObject<number> | null) => (prop: string): string => {
  const value = parsed == null ? 0 : parsed[prop] || 0;
  const isoEquiv = propMapToISO[prop];

  if (prop === "seconds" && parsed && parsed.milliseconds) {
    return `${value}.${formatMilliseconds(parsed.milliseconds)}${isoEquiv}`;
  }

  return `${value}${isoEquiv}`;
};

export const parseInterval = (raw: string): string => {
  const parsed = parse(raw);
  const datePart = dateProps.map(buildProperty(parsed)).join("");
  const timePart = timeProps.map(buildProperty(parsed)).join("");

  return `P${datePart}T${timePart}`;
};
