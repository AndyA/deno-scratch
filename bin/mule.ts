/* eslint-disable @typescript-eslint/ban-ts-comment */
import _ from "lodash";
// @ts-ignore
import { MultiCron, Cron } from "../lib/cron.ts";
// @ts-ignore
import type { CronSpec } from "../lib/cron.ts";

const monthEnd: CronSpec = {
  day: [-1],
  // dow: [1, 2, 3, 4, 5],
  hour: [14],
  minute: [3],
  second: [37],
};

const friday: CronSpec = {
  dow: [5],
  hour: [18],
  minute: [30],
  second: [0],
};

const leapYears: CronSpec = {
  day: [29],
  month: [1],
  hour: [23],
  minute: [59],
  second: [59],
};

const cron = new MultiCron([
  new Cron(monthEnd),
  new Cron(leapYears),
  new Cron(friday),
]);
const start = new Date();

for (const date of cron.after(start, 20)) console.log(date);
