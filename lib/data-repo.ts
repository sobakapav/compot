import { execFile } from "child_process";
import { promisify } from "util";
import { getDataRepoConfig } from "./config";

const execFileAsync = promisify(execFile);

type PushResult =
  | { status: "skipped"; reason: string }
  | { status: "clean" }
  | { status: "pushed"; commit: string }
  | { status: "failed"; error: string };

type PushStatus = {
  status: PushResult["status"];
  at: string;
  error?: string;
  reason?: string;
  commit?: string;
};

type DataRepoStatus = {
  enabled: boolean;
  intervalMinutes: number;
  path?: string;
  branch?: string;
  lastAuto?: PushStatus;
  lastManual?: PushStatus;
};

const getState = () => {
  const globalState = globalThis as typeof globalThis & {
    __compotAutoPushStarted?: boolean;
    __compotDataRepoStatus?: DataRepoStatus;
  };
  if (!globalState.__compotDataRepoStatus) {
    globalState.__compotDataRepoStatus = {
      enabled: false,
      intervalMinutes: 60,
    };
  }
  return globalState;
};

const recordStatus = (reason: "auto" | "manual", result: PushResult) => {
  const state = getState();
  const current: DataRepoStatus =
    state.__compotDataRepoStatus ?? {
      enabled: false,
      intervalMinutes: 60,
    };
  const status: PushStatus = {
    status: result.status,
    at: new Date().toISOString(),
  };
  if (result.status === "failed") {
    status.error = result.error;
  }
  if (result.status === "skipped") {
    status.reason = result.reason;
  }
  if (result.status === "pushed") {
    status.commit = result.commit;
  }
  if (reason === "auto") {
    state.__compotDataRepoStatus = {
      ...current,
      lastAuto: status,
    };
  } else {
    state.__compotDataRepoStatus = {
      ...current,
      lastManual: status,
    };
  }
};

const runGit = async (args: string[], cwd: string) => {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
};

const isGitRepo = async (cwd: string) => {
  try {
    const output = await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
    return output === "true";
  } catch {
    return false;
  }
};

const hasChanges = async (cwd: string) => {
  const output = await runGit(["status", "--porcelain"], cwd);
  return output.length > 0;
};

const formatCommitMessage = (reason: "auto" | "manual") => {
  const now = new Date().toISOString();
  return `${reason}: ${now}`;
};

export const pushDataRepo = async (
  reason: "auto" | "manual"
): Promise<PushResult> => {
  const config = await getDataRepoConfig();
  const repoPath = config?.path;
  if (!repoPath) {
    const result: PushResult = { status: "skipped", reason: "missing-path" };
    recordStatus(reason, result);
    return result;
  }
  if (!(await isGitRepo(repoPath))) {
    const result: PushResult = { status: "skipped", reason: "not-a-git-repo" };
    recordStatus(reason, result);
    return result;
  }
  try {
    const dirty = await hasChanges(repoPath);
    if (!dirty) {
      const result: PushResult = { status: "clean" };
      recordStatus(reason, result);
      return result;
    }
    await runGit(["add", "-A"], repoPath);
    const message = formatCommitMessage(reason);
    try {
      await runGit(["commit", "-m", message], repoPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("nothing to commit")) {
        const result: PushResult = { status: "clean" };
        recordStatus(reason, result);
        return result;
      }
      const result: PushResult = { status: "failed", error: msg };
      recordStatus(reason, result);
      return result;
    }
    await runGit(["push"], repoPath);
    const result: PushResult = { status: "pushed", commit: message };
    recordStatus(reason, result);
    return result;
  } catch (err) {
    const result: PushResult = {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
    recordStatus(reason, result);
    return result;
  }
};

export const ensureAutoPushStarted = async () => {
  const state = getState();
  if (state.__compotAutoPushStarted) return;
  state.__compotAutoPushStarted = true;

  const config = await getDataRepoConfig();
  const intervalMinutes = config?.autoPushMinutes ?? 60;
  state.__compotDataRepoStatus = {
    ...state.__compotDataRepoStatus,
    enabled: Boolean(config?.path) && intervalMinutes > 0,
    intervalMinutes,
    path: config?.path,
    branch: config?.branch,
  };
  if (!config?.path || intervalMinutes <= 0) return;

  const tick = async () => {
    const result = await pushDataRepo("auto");
    if (result.status === "failed") {
      console.warn("[data-repo] auto push failed:", result.error);
    }
  };

  void tick();
  setInterval(tick, intervalMinutes * 60 * 1000);
};

export const getDataRepoStatus = async (): Promise<DataRepoStatus> => {
  const state = getState();
  if (!state.__compotAutoPushStarted) {
    const config = await getDataRepoConfig();
    return {
      enabled: Boolean(config?.path) && (config?.autoPushMinutes ?? 60) > 0,
      intervalMinutes: config?.autoPushMinutes ?? 60,
      path: config?.path,
      branch: config?.branch,
      lastAuto: state.__compotDataRepoStatus?.lastAuto,
      lastManual: state.__compotDataRepoStatus?.lastManual,
    };
  }
  return state.__compotDataRepoStatus!;
};
