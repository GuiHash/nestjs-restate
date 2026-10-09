import "reflect-metadata";
import * as common from "@nestjs/common";
import * as core from "@nestjs/core";
import * as lib from "../../dist/index.mjs";
import runSmoke from "./run-smoke.cjs";

await runSmoke({ format: "esm", lib, common, core });
