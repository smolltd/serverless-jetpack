"use strict";

const path = require("path");
const { remove } = require("fs-extra");
const execa = require("execa");
const { exists } = require("../../util/bundle");

// Constants.
// We're doing real builds, so these tests are **slow** (particularly on Win).
const TIMEOUT = 60000;

// Helpers.
const IS_WIN = process.platform === "win32";
const SLS_CMD = `node_modules/.bin/serverless${IS_WIN ? ".cmd" : ""}`;

describe("jetpack package", function () {
  this.timeout(TIMEOUT); // eslint-disable-line no-invalid-this

  let mode;
  const sls = (args, opts) => execa(SLS_CMD, args, {
    env: {
      ...process.env,
      PKG: "yarn",
      MODE: mode
    },
    ...opts
  });

  beforeEach(() => {
    mode = "deps"; // default
  });

  describe("simple", () => {
    const cwd = path.resolve(__dirname, "../packages/simple/yarn");
    const PKG_DIR = path.join(cwd, ".serverless");

    beforeEach(async () => {
      await remove(PKG_DIR);
    });

    it("displays CLI usage", async () => {
      const { stdout } = await sls(["jetpack", "package", "-h"], { cwd });
      expect(stdout)
        .to.contain("jetpack package").and
        .to.contain("--function / -f");
    });

    it("packages the entire service with no options", async () => {
      const { stdout } = await sls(["jetpack", "package"], { cwd });
      const pkg = path.normalize(".serverless/serverless-jetpack-simple.zip");
      expect(stdout).to.contain(`Packaged service (dependency mode): ${pkg}`);

      const pkgExists = await exists(path.join(PKG_DIR, "serverless-jetpack-simple.zip"));
      expect(pkgExists).to.equal(true);
    });

    it("packages the entire service with no options in trace mode", async () => {
      mode = "trace";
      const { stdout } = await sls(["jetpack", "package"], { cwd });
      const pkg = path.normalize(".serverless/serverless-jetpack-simple.zip");
      expect(stdout).to.contain(`Packaged service (trace mode): ${pkg}`);

      const pkgExists = await exists(path.join(PKG_DIR, "serverless-jetpack-simple.zip"));
      expect(pkgExists).to.equal(true);
    });

    it("packages the entire service with -f base", async () => {
      const { stdout } = await sls(["jetpack", "package", "-f", "base"], { cwd });
      const pkg = path.normalize(".serverless/serverless-jetpack-simple.zip");
      expect(stdout).to.contain(`Packaged service (dependency mode): ${pkg}`);

      expect(await exists(path.join(PKG_DIR, "serverless-jetpack-simple.zip"))).to.equal(true);
    });
  });

  describe("individually", () => {
    const cwd = path.resolve(__dirname, "../packages/individually/yarn");
    const PKG_DIR = path.join(cwd, ".serverless");

    beforeEach(async () => {
      await remove(PKG_DIR);
    });

    it("packages all functions with no options", async () => {
      const { stdout } = await sls(["jetpack", "package"], { cwd });
      expect(stdout)
        .to.contain(
          `Packaged function (dependency mode): ${path.normalize(".serverless/base.zip")}`).and
        .to.contain(
          `Packaged function (dependency mode): ${path.normalize(".serverless/another.zip")}`);

      expect(await exists(path.join(PKG_DIR, "base.zip"))).to.equal(true);
      expect(await exists(path.join(PKG_DIR, "another.zip"))).to.equal(true);
    });

    it("packages all functions with no options in trace mode", async () => {
      mode = "trace";
      const { stdout } = await sls(["jetpack", "package"], { cwd });
      expect(stdout)
        .to.contain(`Packaged function (trace mode): ${path.normalize(".serverless/base.zip")}`).and
        .to.contain(`Packaged function (trace mode): ${path.normalize(".serverless/another.zip")}`);

      expect(await exists(path.join(PKG_DIR, "base.zip"))).to.equal(true);
      expect(await exists(path.join(PKG_DIR, "another.zip"))).to.equal(true);
    });

    it("packages 1 function with -f base", async () => {
      const { stdout } = await sls(["jetpack", "package", "-f", "base"], { cwd });
      expect(stdout)
        .to.contain(
          `Packaged function (dependency mode): ${path.normalize(".serverless/base.zip")}`).and
        .to.not.contain(
          `Packaged function (dependency mode): ${path.normalize(".serverless/another.zip")}`);

      expect(await exists(path.join(PKG_DIR, "base.zip"))).to.equal(true);
      expect(await exists(path.join(PKG_DIR, "another.zip"))).to.equal(false);
    });
  });

  describe("complex", () => {
    const cwd = path.resolve(__dirname, "../packages/complex/yarn");
    const PKG_DIR = path.join(cwd, ".serverless");
    const SERVICE_PKG = path.normalize(".serverless/serverless-jetpack-complex.zip");
    const INDIVIDUALLY_PKG = path.normalize(".serverless/individually.zip");
    const DISABLED_PKG = path.normalize(".serverless/disabled.zip");

    beforeEach(async () => {
      await remove(PKG_DIR);
    });

    it("packages all functions with no options", async () => {
      const { stdout } = await sls(["jetpack", "package", "--report"], { cwd });
      expect(stdout)
        .to.contain(`Packaged service (dependency mode): ${SERVICE_PKG}`).and
        .to.contain(`Packaged function (dependency mode): ${INDIVIDUALLY_PKG}`).and
        .to.not.contain(`Packaged function (dependency mode): ${DISABLED_PKG}`);

      expect(await exists(path.join(cwd, SERVICE_PKG))).to.equal(true);
      expect(await exists(path.join(cwd, INDIVIDUALLY_PKG))).to.equal(true);
      expect(await exists(path.join(cwd, DISABLED_PKG))).to.equal(false);
    });

    it("packages all functions with no options in trace mode", async () => {
      mode = "trace";
      const { stdout } = await sls(["jetpack", "package", "--report"], { cwd });
      expect(stdout)
        .to.contain(`Packaged service (trace mode): ${SERVICE_PKG}`).and
        .to.contain(`Packaged function (trace mode): ${INDIVIDUALLY_PKG}`).and
        .to.not.contain(`Packaged function (trace mode): ${DISABLED_PKG}`);

      expect(await exists(path.join(cwd, SERVICE_PKG))).to.equal(true);
      expect(await exists(path.join(cwd, INDIVIDUALLY_PKG))).to.equal(true);
      expect(await exists(path.join(cwd, DISABLED_PKG))).to.equal(false);
    });

    it("packages 1 function with -f individually", async () => {
      const { stdout } = await sls(["jetpack", "package", "--function", "individually"], { cwd });
      expect(stdout)
        .to.contain(`Packaged function (dependency mode): ${INDIVIDUALLY_PKG}`).and
        .to.not.contain(`Packaged service (dependency mode): ${SERVICE_PKG}`).and
        .to.not.contain(`Packaged function (dependency mode): ${DISABLED_PKG}`);

      expect(await exists(path.join(cwd, INDIVIDUALLY_PKG))).to.equal(true);
      expect(await exists(path.join(cwd, SERVICE_PKG))).to.equal(false);
      expect(await exists(path.join(cwd, DISABLED_PKG))).to.equal(false);
    });

    it("packages service with -f base", async () => {
      const { stdout } = await sls(["jetpack", "package", "--function", "base"], { cwd });
      expect(stdout)
        .to.contain(`Packaged service (dependency mode): ${SERVICE_PKG}`).and
        .to.not.contain(`Packaged function (dependency mode): ${INDIVIDUALLY_PKG}`).and
        .to.not.contain(`Packaged function (dependency mode): ${DISABLED_PKG}`);

      expect(await exists(path.join(cwd, SERVICE_PKG))).to.equal(true);
      expect(await exists(path.join(cwd, INDIVIDUALLY_PKG))).to.equal(false);
      expect(await exists(path.join(cwd, DISABLED_PKG))).to.equal(false);
    });
  });
});
