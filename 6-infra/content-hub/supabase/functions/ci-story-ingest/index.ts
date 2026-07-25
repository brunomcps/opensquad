import { parseAgentIngestKeys } from '../_shared/agentIngestAuth.ts';
import { serviceClient } from '../_shared/client.ts';
import { errorResponse, json, preflight } from '../_shared/http.ts';
import { handleStoryAgentIngest } from '../_shared/storyAgentIngest.ts';

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  try {
    const result = await handleStoryAgentIngest(
      request,
      serviceClient(),
      parseAgentIngestKeys(Deno.env.get('CI_STORY_INGEST_KEYS')),
      Deno.env.get('CI_APP_PUBLIC_URL') || '',
    );
    return json(request, { ok: true, ...result });
  } catch (error) {
    return errorResponse(request, error);
  }
});

