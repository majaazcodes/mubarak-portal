import { Algorithm, type Options } from "@node-rs/argon2";

export const ARGON_OPTS: Options = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};
