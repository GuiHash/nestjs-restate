// Boots a real NestJS application context against the *built* package and
// asserts that Restate components are discovered and served. Shared by the
// ESM (smoke.mjs) and CJS (smoke.cjs) entrypoints so both dist formats are
// exercised with whatever @nestjs/* version is installed.
const assert = require("node:assert/strict");
const http2 = require("node:http2");

async function discover(port) {
    const client = http2.connect(`http://localhost:${port}`);
    try {
        return await new Promise((resolve, reject) => {
            const req = client.request({
                ":method": "GET",
                ":path": "/discover",
                accept: "application/vnd.restate.endpointmanifest.v3+json",
            });
            let body = "";
            req.setEncoding("utf8");
            req.on("data", (chunk) => {
                body += chunk;
            });
            req.on("end", () => resolve(JSON.parse(body)));
            req.on("error", reject);
            req.end();
        });
    } finally {
        client.close();
    }
}

module.exports = async function runSmoke({ format, lib, common, core }) {
    const { Handler, RestateExecutionContext, RestateModule, Service } = lib;

    class Greeter {
        greet(name) {
            return `hello ${name}`;
        }
    }
    Handler()(
        Greeter.prototype,
        "greet",
        Object.getOwnPropertyDescriptor(Greeter.prototype, "greet"),
    );
    Service("greeter")(Greeter);

    const server = http2.createServer();
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();

    class AppModule {}
    common.Module({
        imports: [
            RestateModule.forRoot({
                ingress: "http://localhost:8080",
                endpoint: { server },
            }),
        ],
        providers: [Greeter],
    })(AppModule);

    const app = await core.NestFactory.createApplicationContext(AppModule, { logger: false });
    try {
        const manifest = await discover(port);
        const greeter = manifest.services.find((s) => s.name === "greeter");
        assert.ok(greeter, `greeter service not discovered: ${JSON.stringify(manifest)}`);
        assert.deepEqual(
            greeter.handlers.map((h) => h.name),
            ["greet"],
        );

        const ctx = RestateExecutionContext.create({
            getArgs: () => [{ name: "nest" }, "restate-ctx"],
            getClass: () => Greeter,
            getHandler: () => Greeter.prototype.greet,
            getType: () => "restate",
        });
        assert.equal(ctx.getType(), "restate");
        assert.deepEqual(ctx.getInput(), { name: "nest" });
        assert.equal(ctx.getRestateContext(), "restate-ctx");
    } finally {
        await app.close();
        await new Promise((resolve) => server.close(resolve));
    }

    console.log(`${format}: ok`);
};
