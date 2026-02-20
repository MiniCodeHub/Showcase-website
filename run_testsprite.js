const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { execSync } = require("child_process");

async function run() {
    const transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@testsprite/testsprite-mcp@latest", "server"],
        env: { ...process.env, API_KEY: "sk-user-aeamjq_3aBoWn6IYnIxIyyHhBqPNvPBzvkM2wcDX8mI6c3OrK9DhiBTABuLUbS2W7yIqOHP3yXGupIclj4-KWzWV1zK5vwlVqBBYD0zx7eJauoivGMMm4QyEYESL5jE8zC0" }
    });

    const client = new Client(
        { name: "test-runner", version: "1.0.0" },
        { capabilities: {} }
    );

    console.log("Connecting to TestSprite MCP server...");
    await client.connect(transport);
    console.log("Connected.");

    console.log("Listing tools...");
    const tools = await client.listTools();
    console.log("Available tools:", tools.tools.map(t => t.name).join(", "));

    console.log("Calling testsprite_generate_code_and_execute...");
    // We need to pass the repo path.
    const result = await client.callTool({
        name: "testsprite_generate_code_and_execute",
        arguments: {}
    });

    console.log("Tool result:", JSON.stringify(result, null, 2));

    console.log("Now running testsprite execute...");
    try {
        const out = execSync("npx -y @testsprite/testsprite-mcp@latest generateCodeAndExecute", { encoding: "utf8", stdio: "inherit" });
        console.log(out);
    } catch (e) {
        console.error("Execute failed:", e.message);
    }

    process.exit(0);
}

run().catch(console.error);
