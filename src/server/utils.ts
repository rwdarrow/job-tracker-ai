/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
export const enumToString = (e: any): string => {
  const enumStrings: string[] = [];
  for (const key in e) {
    if (e.hasOwnProperty(key) && !Number.isNaN(parseInt(key))) {
      enumStrings.push(`${e[key]}`);
    }
  }
  return `{${enumStrings.join(", ")}}`;
};
