declare module 'lunar-javascript' {
  export const Solar: any;
  export const Lunar: any;
}

declare module 'korean-lunar-calendar' {
  export default class KoreanLunarCalendar {
    setSolarDate(year: number, month: number, day: number): void;
    setLunarDate(year: number, month: number, day: number, isLeap: boolean): void;
    getLunarCalendar(): { year: number; month: number; day: number; isLeap: boolean };
    getSolarCalendar(): { year: number; month: number; day: number };
  }
}
