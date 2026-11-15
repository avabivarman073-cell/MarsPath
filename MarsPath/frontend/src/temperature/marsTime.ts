/**
 * MarsPath - Mars Local Time Calculator
 *
 * Calculates Mars Sol Date (MSD), Mars Coordinated Time (MTC),
 * and Mars Local Mean Solar Time (LMST) from the current Earth UTC time.
 *
 * Default longitude is an approximate Perseverance landing-site longitude
 * in Jezero Crater. Longitude is east-positive.
 *
 * This calculates Mars time, NOT live Mars weather.
 */

export const PERSEVERANCE_LONGITUDE_DEG = 77.45;

// TT - UTC difference in seconds for modern dates.
// Revisit this value if a future leap second is introduced.
const TT_MINUS_UTC_SECONDS = 69.184;

const JULIAN_DATE_UNIX_EPOCH = 2440587.5;
const MARS_SOL_LENGTH_EARTH_DAYS = 1.0274912517;
const MARS_EPOCH_JD_TT = 2405522.0028779;

export interface MarsTime {
  marsSolDate: number;
  sol: number;
  mtc: string;
  lmstHours: number;
  lmst: string;
  lmstMinute: number;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function formatMarsClock(decimalHours: number): string {
  const totalSeconds = Math.floor(positiveModulo(decimalHours, 24) * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function getMarsTime(
  date: Date = new Date(),
  longitudeDeg: number = PERSEVERANCE_LONGITUDE_DEG
): MarsTime {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("A valid JavaScript Date is required.");
  }

  if (!Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) {
    throw new Error("Longitude must be between -180 and 180 degrees.");
  }

  const jdUtc = date.getTime() / 86400000 + JULIAN_DATE_UNIX_EPOCH;
  const jdTt = jdUtc + TT_MINUS_UTC_SECONDS / 86400;

  const marsSolDate =
    (jdTt - MARS_EPOCH_JD_TT) / MARS_SOL_LENGTH_EARTH_DAYS;

  const fractionalSol = positiveModulo(marsSolDate, 1);
  const mtcHours = fractionalSol * 24;

  const lmstHours = positiveModulo(mtcHours + longitudeDeg / 15, 24);
  const lmstMinute = Math.floor(lmstHours * 60);

  return {
    marsSolDate,
    sol: Math.floor(marsSolDate),
    mtc: formatMarsClock(mtcHours),
    lmstHours,
    lmst: formatMarsClock(lmstHours),
    lmstMinute,
  };
}

export function getCurrentMarsTime(
  longitudeDeg: number = PERSEVERANCE_LONGITUDE_DEG
): MarsTime {
  return getMarsTime(new Date(), longitudeDeg);
}
