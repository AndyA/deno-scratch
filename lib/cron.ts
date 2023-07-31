import _ from "https://cdn.skypack.dev/lodash?dts";
import { snapVector } from "./vector.ts";
import type { Vector, Radix } from "./vector.ts";

export type CronSpec = {
  month?: Vector;
  day?: Vector;
  dow?: Vector;
  hour?: Vector;
  minute?: Vector;
  second?: Vector;
};

export const cronUnitRange: Record<keyof CronSpec, [number, number]> = {
  second: [0, 60],
  minute: [0, 60],
  hour: [0, 24],
  day: [1, 32],
  dow: [0, 7],
  month: [0, 12],
};

const tidySet = (unit: keyof CronSpec, set: Vector): Vector => {
  const [low, high] = cronUnitRange[unit];
  return [...new Set(set.map(Math.round))]
    .filter(
      n => (n >= low && n < high) || (unit === "day" && -n >= low && -n < high)
    )
    .sort((a, b) => a - b);
};

const tidySpec = (spec: CronSpec): CronSpec =>
  Object.fromEntries(
    Object.entries(spec).map(([prop, set]) => [
      prop,
      tidySet(prop as keyof CronSpec, set),
    ])
  );

const vectorFromDate = (date: Date): Vector => {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ];
};

const dateFromVector = (vector: Vector): Date => {
  const [year, month, day, hour, minute, second] = vector;
  return new Date(year, month, day, hour, minute, second);
};

type MonthInfo = {
  days: Set<number>;
  weekDays: Map<number, Set<number>>;
  last: number;
};

const scanMonth = (year: number, month: number): MonthInfo => {
  const days = new Set<number>();
  const weekDays = new Map<number, Set<number>>();
  for (let last = 1; ; last++) {
    const date = new Date(year, month, last);
    if (date.getUTCMonth() !== month) return { days, weekDays, last };
    days.add(last);
    const weekDay = date.getDay();
    let slot = weekDays.get(weekDay);
    if (!slot) weekDays.set(weekDay, (slot = new Set<number>()));
    slot.add(last);
  }
};

const wrap = (vec: Vector) => () => vec;
const addSet = (a: Set<number>, b: Set<number>): void =>
  b.forEach(n => a.add(n));

abstract class CronBase {
  abstract snap(date: Date): Date;
  abstract step(date: Date): Date;

  *after(date: Date, limit?: number) {
    date = this.snap(date);
    while (date) {
      if (limit !== undefined && --limit < 0) break;
      yield date;
      date = this.step(date);
    }
  }
}

export class Cron extends CronBase {
  spec: CronSpec;
  #radix?: Radix;

  constructor(spec: CronSpec) {
    super();
    this.spec = tidySpec(spec);
  }

  private makeRadix(): Radix {
    const { spec } = this;

    // Available days depends on the current year, month and the union of
    // day and dow specs.
    const mkDay = ([year, month]: Vector) => {
      const { days, weekDays, last } = scanMonth(year, month);
      if (!spec.day && !spec.dow) return [...days];
      const set = new Set<number>();

      // Add all the valid days
      (spec.day || [])
        // Allow negative day numbers to index from the end of the month
        .map(n => (n < 0 ? last + n : n))
        .filter(n => days.has(n))
        .forEach(n => set.add(n));

      // And all the weekdays.
      (spec.dow || [])
        .filter(n => weekDays.has(n))
        .forEach(n => addSet(set, weekDays.get(n) as Set<number>));
      return [...set].sort((a, b) => a - b);
    };

    const mk = (prop: keyof CronSpec) =>
      wrap(spec[prop] || _.range(...cronUnitRange[prop]));

    return [mk("month"), mkDay, mk("hour"), mk("minute"), mk("second")];
  }

  private get radixTail(): Radix {
    return (this.#radix = this.#radix || this.makeRadix());
  }

  private snapVector(vec: Vector): Date {
    const year = vec[0];
    const radix = [wrap(_.range(year, year + 16)), ...this.radixTail];
    const snapped = snapVector(vec, radix);
    if (!snapped) throw new Error(`Can't solve crontab`);
    return dateFromVector(snapped);
  }

  snap(date: Date): Date {
    return this.snapVector(vectorFromDate(date));
  }

  step(date: Date): Date {
    const vec = vectorFromDate(date);
    vec[vec.length - 1]++;
    return this.snapVector(vec);
  }
}

const earliest = (dates: Date[]): Date =>
  new Date(Math.min(...dates.map(d => d.getTime())));

export class MultiCron extends CronBase {
  crons: Cron[];

  constructor(crons: Cron[]) {
    super();
    this.crons = crons;
  }

  snap(date: Date): Date {
    return earliest(this.crons.map(cron => cron.snap(date)));
  }

  step(date: Date): Date {
    return earliest(this.crons.map(cron => cron.step(date)));
  }
}
