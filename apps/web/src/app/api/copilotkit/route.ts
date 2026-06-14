import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint
} from "@copilotkit/runtime";
import { BuiltInAgent } from "@copilotkit/runtime/v2";

import {
  buildCopilotPrompt,
  fetchCopilotContext,
  getCopilotGoogleApiKey,
  getCopilotModel
} from "@/lib/copilot-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const copilotRuntime = new CopilotRuntime({
  agents: async ({ request }) => {
    const context = await fetchCopilotContext(
      request.headers.get("authorization")
    );

    return {
      default: new BuiltInAgent({
        apiKey: getCopilotGoogleApiKey(),
        maxSteps: 1,
        model: getCopilotModel(),
        prompt: buildCopilotPrompt(context)
      })
    };
  }
});

const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  endpoint: "/api/copilotkit",
  runtime: copilotRuntime
});

async function routeHandler(request: Request) {
  return handleRequest(request);
}

export async function GET(request: Request) {
  return routeHandler(request);
}

export async function OPTIONS(request: Request) {
  return routeHandler(request);
}

export async function POST(request: Request) {
  return routeHandler(request);
}
