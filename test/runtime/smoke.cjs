require("reflect-metadata");
const runSmoke = require("./run-smoke.cjs");

runSmoke({
    format: "cjs",
    lib: require("../../dist/index.cjs"),
    common: require("@nestjs/common"),
    core: require("@nestjs/core"),
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
