import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  boss: {
    on: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  repository: {
    close: vi.fn(),
  },
  configureQueues: vi.fn(),
  registerWorkers: vi.fn(),
}));

vi.mock("pg-boss", () => ({
  PgBoss: vi.fn(function PgBossMock() {
    return mocks.boss;
  }),
}));

vi.mock("./worker-repository.js", () => ({
  createWorkerRepository: vi.fn(() => mocks.repository),
}));

vi.mock("./queue.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./queue.js")>();
  return {
    ...actual,
    configureQueues: mocks.configureQueues,
    enqueueEntityJob: vi.fn(),
  };
});

vi.mock("./worker-runtime.js", () => ({
  registerWorkers: mocks.registerWorkers,
}));

import { startWorker } from "./index.js";

const config = {
  databaseUrl: "postgres://worker-db",
  validatorBaseUrl: "http://validator.internal",
  validatorSharedToken: "test-token",
};

describe("startWorker stop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.boss.start.mockResolvedValue(undefined);
    mocks.boss.stop.mockResolvedValue(undefined);
    mocks.configureQueues.mockResolvedValue(undefined);
    mocks.registerWorkers.mockResolvedValue(undefined);
    mocks.repository.close.mockResolvedValue(undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("awaits repository close after pg-boss stops", async () => {
    const closing = deferred();
    mocks.repository.close.mockReturnValue(closing.promise);
    const runtime = await startWorker(config);

    const stopping = runtime.stop();
    let settled = false;
    void stopping.then(() => {
      settled = true;
    });

    await vi.waitFor(() => expect(mocks.repository.close).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    closing.resolve();

    await expect(stopping).resolves.toBeUndefined();
    expect(mocks.boss.stop).toHaveBeenCalledWith({
      graceful: true,
      timeout: 30_000,
    });
  });

  it("awaits repository close before propagating a pg-boss stop failure", async () => {
    const stopFailure = new Error("stable boss stop failure");
    const closing = deferred();
    mocks.boss.stop.mockRejectedValue(stopFailure);
    mocks.repository.close.mockReturnValue(closing.promise);
    const runtime = await startWorker(config);

    const stopping = runtime.stop();
    let settled = false;
    void stopping.catch(() => {
      settled = true;
    });

    await vi.waitFor(() => expect(mocks.repository.close).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    closing.resolve();

    await expect(stopping).rejects.toBe(stopFailure);
  });

  it("preserves both pg-boss stop and repository close failures", async () => {
    const stopFailure = new Error("stable boss stop failure");
    const closeFailure = new Error("stable repository close failure");
    mocks.boss.stop.mockRejectedValue(stopFailure);
    mocks.repository.close.mockRejectedValue(closeFailure);
    const runtime = await startWorker(config);

    const failure = await runtime.stop().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AggregateError);
    expect(failure).toMatchObject({
      message: "WORKER_STOP_AND_CLOSE_FAILED",
      errors: [stopFailure, closeFailure],
    });
  });
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
