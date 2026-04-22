import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  try {
    const { action, message, context } = await req.json();

    if (action === "apply") {
      return jsonResponse({ error: "Apply via frontend API" }, 501);
    }

    if (!message) {
      return jsonResponse({ error: "Message is required" }, 400);
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    const experimentInfo = context?.experimentConfig ? 
      `\nCurrent experiment configuration:\n${JSON.stringify(context.experimentConfig, null, 2)}` : '';
    const warnings = context?.activeWarnings?.length ?
      `\nActive warnings:\n${context.activeWarnings.join('\n')}` : '';
    const participantCount = context?.participantCount ?
      `\n${context.participantCount} participant(s) in room` : '';
    const roomIdInfo = context?.roomId ? `\nRoom ID: ${context.roomId}` : '';

    const fullContext = `${experimentInfo}${warnings}${participantCount}${roomIdInfo}`;

    const systemInstruction = {
      parts: [{
        text: `You are a scientific research methodology assistant for PsychoLab.ge, a cognitive psychology research platform. You have deep knowledge of experimental psychology, psychophysics, and cognitive science.
        
You can help researchers with:
- Trial count recommendations based on validated protocols
- ISI and timing settings
- Experiment design improvements
- Accessibility considerations (colorblind screening, etc.)
- Sample size guidance with power analysis
- Citation information

When the user asks to modify settings (like "change trials to 50" or "set ISI to 1000ms"), respond with a JSON object describing the change in your response. Format:
[MODIFY] {"field": "trials", "value": 50, "reason": "Increased for better statistical power based on typical protocols"}
[/MODIFY]

The user must confirm changes before they are applied. Be specific, cite papers when relevant, and keep responses concise. Never be condescending.`
      }]
    };

    if (!geminiApiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY not configured" }, 500);
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction,
          contents: [
            {
              parts: [
                {
                  text: `${fullContext}\n\nUser: ${message}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse({ error: data.error?.message || "Failed to get response from Gemini" }, response.status);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return jsonResponse({ reply });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
