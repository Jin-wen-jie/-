import { hash, verify } from "@node-rs/argon2";

export interface AdminRepo {
  find: () => Promise<{ id: number } | null>;
  create: (data: {
    id: number;
    username: string;
    passwordHash: string;
    forcePasswordChange: boolean;
  }) => Promise<void>;
}

export interface BootstrapConfig {
  username: string;
  password: string;
}

export async function bootstrapAdmin(
  repo: AdminRepo,
  config: BootstrapConfig,
): Promise<void> {
  const existing = await repo.find();
  if (existing) {
    // Never overwrite existing admin
    return;
  }

  const passwordHash = await hash(config.password, {
    memoryCost: 65536,
    timeCost: 3,
    outputLen: 32,
  });

  await repo.create({
    id: 1,
    username: config.username,
    passwordHash,
    forcePasswordChange: true,
  });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return verify(hash, password);
}
