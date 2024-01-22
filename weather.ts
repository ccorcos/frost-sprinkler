import "dotenv/config";

if (!process.env.EMAIL_KEY)
  throw new Error("Missing EMAIL_KEY environment variable.");
const key = process.env.EMAIL_KEY;

// "https://chet-email.web.val.run"
if (!process.env.EMAIL_URL)
  throw new Error("Missing EMAIL_URL environment variable.");
const emailUrl = process.env.EMAIL_URL;

// "http://weatherlinklive-719e35.local/v1/current_conditions"
if (!process.env.WEATHERLINK_URL)
  throw new Error("Missing WEATHERLINK_URL environment variable.");
const weatherlinkUrl = process.env.WEATHERLINK_URL;

// "http://192.168.1.79/cm?pw=XXX&sid=23"
if (!process.env.OPENSPRINKLER_URL)
  throw new Error("Missing OPENSPRINKLER_URL environment variable.");
const openSprinklerUrl = process.env.OPENSPRINKLER_URL;

const onBelowF = 57;
const offAboveF = 58;

type OnState = {
  on: true;
  startMs: number;
  minF: number;
};

type OffState = { on: false };

let state: OnState | OffState = { on: false };

loop(async () => {
  const weather = await getWeather();

  console.log("Temperature: " + weather.temp + "F");

  if (!state.on && weather.temp <= onBelowF) {
    state = { on: true, startMs: Date.now(), minF: weather.temp };
    console.log("Turning on.");
    await sendEmail({
      subject: `Frost Sprinklers`,
      text: "Turning on " + new Date().toLocaleString(),
    });
    const MinuteS = 60;
    const HourS = 60 * MinuteS;
    await runSprinkler(8 * HourS); // maximum of 8 hours
  }

  if (state.on) {
    state.minF = Math.min(state.minF, weather.temp);
  }

  if (state.on && weather.temp >= offAboveF) {
    console.log("Turning off.");
    const oldState = state;
    state = { on: false };
    await sendEmail({
      subject: `Frost Sprinklers`,
      text: [
        "Turning off " + new Date().toLocaleString(),
        `duration: ${durationMs(Date.now() - oldState.startMs)}`,
        `min temp: ${oldState.minF}°F`,
      ].join("\n"),
    });
    await runSprinkler(0); // off
  }
}, 60 * 1000);

function durationMs(ms: number) {
  const minutes = Math.round(ms / 1000 / 60);

  const hours = Math.floor(minutes / 60);
  const remainder = minutes - hours * 60;

  return `${hours}h${remainder}m`;
}

async function loop(fn: () => void, delayMs: number) {
  while (true) {
    try {
      await fn();
    } catch (error) {
      console.error(error);
    }
    await sleep(delayMs);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSprinkler(timeS: number) {
  const url = new URL(openSprinklerUrl);
  if (timeS >= 1) {
    url.searchParams.set("en", "1");
    url.searchParams.set("t", timeS.toString());
  } else {
    url.searchParams.set("en", "0");
  }
  await fetch(url);
}

async function sendEmail(args: { subject: string; text: string }) {
  const url = new URL(emailUrl);
  url.searchParams.set("key", key);
  url.searchParams.set("subject", args.subject);
  url.searchParams.set("text", args.text);
  const response = await fetch(url);
  const result = await response.json();
  if (result.error)
    throw new Error("Email was not sent! " + JSON.stringify(result));
  else console.log("Email sent!");
}

async function getWeather() {
  const response = await fetch(weatherlinkUrl);
  const data: WeatherlinkResponse = await response.json();
  const weather = data.data.conditions.find(
    (data) => data.data_structure_type === 1
  ) as DavisWeatherStationData | undefined;

  if (!weather) throw new Error("Could not reach WeatherLink.");

  return weather;
}

type DavisWeatherStationData = {
  /** logical sensor ID **(no unit)** */
  lsid: number;
  /** data structure type **(no unit)** */
  data_structure_type: 1;
  /** transmitter ID **(no unit)** */
  txid: number;
  /** most recent valid temperature **(°F)** */
  temp: number;
  /** most recent valid humidity **(%RH)** */
  hum: number;
  /** **(°F)** */
  dew_point: number;
  /** **(°F)** */
  wet_bulb: number | null;
  /** **(°F)** */
  heat_index: number;
  /** **(°F)** */
  wind_chill: number;
  /** **(°F)** */
  thw_index: number;
  /** **(°F)** */
  thsw_index: number;
  /** most recent valid wind speed **(mph)** */
  wind_speed_last: number;
  /** most recent valid wind direction **(°degree)** */
  wind_dir_last: number | null;
  /** average wind speed over last 1 min **(mph)** */
  wind_speed_avg_last_1_min: number;
  /** scalar average wind direction over last 1 min **(°degree)** */
  wind_dir_scalar_avg_last_1_min: number;
  /** average wind speed over last 2 min **(mph)** */
  wind_speed_avg_last_2_min: number;
  /** scalar average wind direction over last 2 min **(°degree)** */
  wind_dir_scalar_avg_last_2_min: number;
  /** maximum wind speed over last 2 min **(mph)** */
  wind_speed_hi_last_2_min: number;
  /** gust wind direction over last 2 min **(°degree)** */
  wind_dir_at_hi_speed_last_2_min: number;
  /** average wind speed over last 10 min **(mph)** */
  wind_speed_avg_last_10_min: number;
  /** scalar average wind direction over last 10 min **(°degree)** */
  wind_dir_scalar_avg_last_10_min: number;
  /** maximum wind speed over last 10 min **(mph)** */
  wind_speed_hi_last_10_min: number;
  /** gust wind direction over last 10 min **(°degree)** */
  wind_dir_at_hi_speed_last_10_min: number;
  /** rain collector type/size **(0: Reserved, 1: 0.01", 2: 0.2 mm, 3:  0.1 mm, 4: 0.001")** */
  rain_size: number;
  /** most recent valid rain rate **(counts/hour)** */
  rain_rate_last: number;
  /** highest rain rate over last 1 min **(counts/hour)** */
  rain_rate_hi: number | null;
  /** total rain count over last 15 min **(counts)** */
  rainfall_last_15_min: number | null;
  /** highest rain rate over last 15 min **(counts/hour)** */
  rain_rate_hi_last_15_min: number;
  /** total rain count for last 60 min **(counts)** */
  rainfall_last_60_min: number | null;
  /** total rain count for last 24 hours **(counts)** */
  rainfall_last_24_hr: number | null;
  /** total rain count since last 24 hour long break in rain **(counts)** */
  rain_storm: number | null;
  /** UNIX timestamp of current rain storm start **(seconds)** */
  rain_storm_start_at: number | null;
  /** most recent solar radiation **(W/m²)** */
  solar_rad: number;
  /** most recent UV index **(Index)** */
  uv_index: number;
  /** configured radio receiver state **(no unit)** */
  rx_state: number;
  /** transmitter battery status flag **(no unit)** */
  trans_battery_flag: number;
  /** total rain count since local midnight **(counts)** */
  rainfall_daily: number;
  /** total rain count since first of month at local midnight **(counts)** */
  rainfall_monthly: number;
  /** total rain count since first of user-chosen month at local midnight **(counts)** */
  rainfall_year: number;
  /** total rain count since last 24 hour long break in rain **(counts)** */
  rain_storm_last: number | null;
  /** UNIX timestamp of last rain storm start **(sec)** */
  rain_storm_last_start_at: number | null;
  /** UNIX timestamp of last rain storm end **(sec)** */
  rain_storm_last_end_at: number | null;
};

type WeatherlinkLiveData = {
  // Apparently the Weatherlink Live has indoor sensors.
  data_structure_type: 4;
  lsid: number; // 690482;
  temp_in: number; // 70.8;
  hum_in: number; // 45.6;
  dew_point_in: number; // 48.8;
  heat_index_in: number; // 69.0;
};

/**
 * Comments are examples of data found from a Vantage Pro2 Plus Sensor Suite (SKU 6328) and a WeatherLink Live.
 * Note that your Davis weather station may not have all of these sensors.
 */
type WeatherlinkResponse = {
  data: {
    did: string; // "001D0A719E35";
    ts: number; // 1705448784;
    conditions: Array<
      | DavisWeatherStationData
      | WeatherlinkLiveData
      // Not sure why this is separate.
      | {
          lsid: number; // 690481;
          data_structure_type: 3;
          bar_sea_level: number; // 30.067;
          bar_trend: number; // -0.021;
          bar_absolute: number; // 29.898;
        }
    >;
  };
  error: null;
};
