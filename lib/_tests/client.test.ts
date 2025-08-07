import { OllamaClient } from "../client";

const [, , test, modelName, prompt] = process.argv;

async function runTest() {
  switch (test) {
    case "list": {
      const result = await OllamaClient.listModels();
      console.log(result.models.map((m) => m.name).join("\n"));
      break;
    }

    case "pull": {
      if (!modelName) throw new Error("Missing model name for pull");
      const res = await OllamaClient.pullModel({ name: modelName });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream from pull");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        process.stdout.write(chunk);
      }
      break;
    }

    case "delete": {
      if (!modelName) throw new Error("Missing model name for delete");
      const res = await OllamaClient.deleteModel({ name: modelName });
      console.log("Deleted:", res);
      break;
    }

    case "show": {
      if (!modelName) throw new Error("Missing model name for show");
      const res = await OllamaClient.showModel({ name: modelName });
      console.dir(res, { depth: null });
      break;
    }

    case "chat": {
      if (!modelName || !prompt)
        throw new Error("Usage: chat <model> <prompt>");
      const responses = await OllamaClient.chat({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
      });
      for (const msg of responses) {
        process.stdout.write(msg.message.content);
      }
      break;
    }

    case "config": {
      const config = await OllamaClient.getConfig();
      console.dir(config);
      break;
    }

    default:
      throw new Error(`Unknown test: ${test}`);
  }

  console.log("\n✓ Test passed");
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err.message);
  process.exit(1);
});
