const NAME_MAP: Record<string, string> = {
  "UPSNAME": "upsName",
  "UPSMODE": "upsMode",
  "STARTTIME": "startTime",
  "LINEV": "lineVoltage",
  "LOADPCT": "loadPercent",
  "BCHARGE": "chargePercent",
  "TIMELEFT": "timeLeft",
  "MBATTCHG": "shutdownCharge",
  "MINTIMEL": "minTimeLeft",
  "MAXTIME": "maxTimeOnBattery",
  "MAXLINEV": "maxLineVoltage",
  "MINLINEV": "minLineVoltage",
  "OUTPUTV": "outputVoltage",
  "SENSE": "sensitivity",
  "DWAKE": "wakeWait",
  "DSHUTD": "powerDownGrace",
  "DLOWBATT": "lowBatterySignalLevel",
  "LOTRANS": "lowLineVoltage",
  "HITRANS": "highLineVoltage",
  "RETPCT": "restorePercent",
  "ITEMP": "internalTemperature",
  "ALARMDEL": "alarmDelay",
  "BATTV": "batteryVoltage",
  "LINEFREQ": "lineFrequency",
  "LASTXFER": "lastTransferReason",
  "NUMXFERS": "transfers",
  "XONBATT": "lastTransferToBatteries",
  "TONBATT": "timeOnBatteries",
  "CUMONBATT": "totalOnBatteries",
  "XOFFBATT": "lastTransferOffBatteries",
  "SELFTEST": "selfTestResult",
  "STESTI": "selfTestInterval",
  "STATFLAG": "statusFlag",
  "DIPSW": "dipSwitches",
  "MANDATE": "manufactureDate",
  "SERIALNO": "serialNumber",
  "BATTDATE": "batteryDate",
  "NOMOUTV": "nominalOutputVoltage",
  "NOMINV": "nominalInputVoltage",
  "NOMBATTV": "nominalBatteryVoltage",
  "NOMPOWER": "nominalPower",
  "HUMIDITY": "humidity",
  "AMBTEMP": "ambientTemperature",
  "EXTBATTS": "externalBatteries",
  "BADBATTS": "badBatteries",
  "APCMODEL": "apcModel",
  "END APC": "endDate",
};

const UNITS = [
  "Percent",
  "Volts",
  "Watts",
  "Seconds",
  "Minutes",
  "Hours",
  "Days",
  "Weeks",
  "Months",
  "Years",
] as const;

export type Unit = typeof UNITS[number];
export type Dimensioned = { value: number; unit: Unit };
export type VariableValue = string | Dimensioned | Date | number;
export type EventRecord = { date: Date; event: string };

const isUnit = (unit: string): unit is Unit => UNITS.includes(unit as Unit);

const parseValue = (value: string): VariableValue => {
  if (/^\d\d\d\d-\d\d-\d\d/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  const mn = value.match(/^(-?\d+(?:\.\d+)?)$/);
  if (mn) return Number(mn[1]);
  const mu = value.match(/^(-?\d+(?:\.\d+)?)\s+(\w+)$/);
  if (mu) {
    const [, num, unit] = mu;
    if (isUnit(unit)) return { value: Number(num), unit };
  }
  return value;
};

const byteReader = (r: ReadableStreamDefaultReader<Uint8Array>) => {
  let pos = 0;
  let buf: Uint8Array;
  return async () => {
    if (!buf || pos === buf.length) {
      const { value, done } = await r.read();
      if (done) throw new Error(`End of stream`);
      if (!value) throw new Error(`No value`);
      buf = value;
      pos = 0;
    }

    return buf[pos++];
  };
};

export class APCClient {
  private readonly conn: Deno.TcpConn;
  private readonly reader: () => Promise<number>;
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>;
  private lock: Promise<string[]> | null = null;

  private constructor(conn: Deno.TcpConn) {
    this.conn = conn;
    this.reader = byteReader(conn.readable.getReader());
    this.writer = conn.writable.getWriter();
  }

  static async connect(
    hostname = "localhost",
    port = 3551,
  ): Promise<APCClient> {
    const conn = await Deno.connect({ hostname, port });
    return new APCClient(conn);
  }

  close() {
    this.conn.close();
  }

  private async send(cmd: string): Promise<void> {
    const len = cmd.length;
    const buf = new Uint8Array(len + 2);
    buf[0] = (len >> 8) & 0xff;
    buf[1] = (len >> 0) & 0xff;
    for (let i = 0; i < len; i++) buf[i + 2] = cmd.charCodeAt(i);
    await this.writer.write(buf);
  }

  private async receive(): Promise<string[]> {
    const out: string[] = [];
    for (;;) {
      const count = (await this.reader() << 8) + await this.reader();
      if (count === 0) break;
      const line: string[] = [];
      for (let i = 0; i < count; i++) {
        line.push(String.fromCharCode(await this.reader()));
      }
      out.push(line.join(""));
    }
    return out.join("").split(/\n/).filter((ln) => ln.length);
  }

  private async command(cmd: string): Promise<string[]> {
    while (this.lock) await this.lock;
    const job = async () => {
      await this.send(cmd);
      return await this.receive();
    };
    this.lock = job().finally(() => this.lock = null);
    return await this.lock;
  }

  async getRawStatus(): Promise<Record<string, string>> {
    const status = await this.command("status");
    const parts = status.flatMap((line) => {
      const m = line.match(/^(\w+(?:\s+\w+)*)\s*:\s*(.*?)\s*$/);
      if (!m) return [];
      const [, name, value] = m;
      return [[name, value]];
    });
    return Object.fromEntries(parts);
  }

  async getStatus(): Promise<Record<string, VariableValue>> {
    const status = await this.getRawStatus();
    const cooked = Object.entries(status).map((
      [name, value],
    ) => [NAME_MAP[name] ?? name.toLowerCase(), parseValue(value)]);
    return Object.fromEntries(cooked);
  }

  async getEvents(): Promise<EventRecord[]> {
    const events = await this.command("events");
    return events.flatMap((line) => {
      const m = line.match(/^(.+)\s\s(.*)$/);
      if (!m) return [];
      const [, date, event] = m;
      return [{ date: new Date(date), event }];
    });
  }
}
