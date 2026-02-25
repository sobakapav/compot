import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { z } from "zod";

export type DataRepoConfig = {
  path?: string;
  remote?: string;
  branch?: string;
  autoPushMinutes?: number;
};

export type AppConfig = {
  dataRepo?: DataRepoConfig;
};

const CONFIG_PATH = path.join(process.cwd(), "config.json");

let cachedConfig: AppConfig | null = null;
let cachedConfigMtime = 0;
let warnedInvalid = false;

const dataRepoSchema = z
  .object({
    path: z.string().min(1).optional(),
    remote: z.string().min(1).optional(),
    branch: z.string().min(1).optional(),
    autoPushMinutes: z.number().int().positive().max(24 * 60).optional(),
  })
  .strict();

const appConfigSchema = z
  .object({
    dataRepo: dataRepoSchema.optional(),
  })
  .strict();

const readConfigFile = async () => {
  try {
    const stat = await fs.stat(CONFIG_PATH);
    if (cachedConfig && cachedConfigMtime === stat.mtimeMs) {
      return cachedConfig;
    }
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const result = appConfigSchema.safeParse(parsed);
    if (!result.success) {
      if (!warnedInvalid) {
        console.warn("[config] invalid config.json, using defaults.");
        warnedInvalid = true;
      }
      cachedConfig = {};
    } else {
      cachedConfig = result.data ?? {};
    }
    cachedConfigMtime = stat.mtimeMs;
    return cachedConfig;
  } catch {
    cachedConfig = {};
    cachedConfigMtime = 0;
    return cachedConfig;
  }
};

export const getAppConfig = async () => readConfigFile();

export const getDataRepoConfig = async (): Promise<DataRepoConfig> => {
  const config = await readConfigFile();
  return config?.dataRepo ?? {};
};

export const getDataRepoPath = async () => {
  const config = await readConfigFile();
  return config?.dataRepo?.path ?? path.join(os.homedir(), "compot-data");
};
