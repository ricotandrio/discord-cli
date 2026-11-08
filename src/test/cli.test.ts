import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("outputs version string with --version", async () => {
  const pkgUrl = new URL("../../package.json", import.meta.url);
  const pkg = JSON.parse(await readFile(pkgUrl, "utf8")) as { version: string };

  const { stdout } = await execFileAsync("node", ["dist/cli.js", "--version"]);
  assert.equal(stdout.trim(), pkg.version);
});

test("outputs version JSON envelope with --version --json", async () => {
  const pkgUrl = new URL("../../package.json", import.meta.url);
  const pkg = JSON.parse(await readFile(pkgUrl, "utf8")) as { version: string };

  const { stdout } = await execFileAsync("node", ["dist/cli.js", "--version", "--json"]);
  const parsed = JSON.parse(stdout.trim());
  assert.deepEqual(parsed, {
    ok: true,
    data: { version: pkg.version },
    next_cursor: null,
  });
});

test("dry-run rejects invalid content and IDs", async () => {
  await assert.rejects(
    () =>
      execFileAsync("node", [
        "dist/cli.js",
        "message",
        "send",
        "--channel-id",
        "not-an-id",
        "--content",
        "hello",
        "--dry-run",
      ]),
    (error: { stdout?: string; code?: number }) => {
      assert.equal(error.code, 2);
      assert.deepEqual(JSON.parse(error.stdout ?? ""), {
        ok: false,
        error: { code: "invalid_input", message: "--channel-id must be a numeric Discord ID" },
      });
      return true;
    },
  );
  await assert.rejects(
    () =>
      execFileAsync("node", [
        "dist/cli.js",
        "message",
        "send",
        "--channel-id",
        "2",
        "--content",
        "x".repeat(2001),
        "--dry-run",
      ]),
    (error: { stdout?: string; code?: number }) => {
      assert.equal(error.code, 2);
      assert.deepEqual(JSON.parse(error.stdout ?? ""), {
        ok: false,
        error: { code: "invalid_input", message: "--content must be between 1 and 2000 characters" },
      });
      return true;
    },
  );
});
