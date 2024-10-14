export const truncateNumber = (num: number, places: number): string => {
  const maxNumber = Number("9".repeat(places));

  if (num > maxNumber) {
    return `${maxNumber}+`;
  }

  return num.toString();
};

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
export const enumToString = (e: any): string => {
  const enumStrings: string[] = [];
  for (const key in e) {
    if (e.hasOwnProperty(key)) {
      enumStrings.push(`${e[key]}`);
    }
  }
  return `{${enumStrings.join(", ")}}`;
};

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
