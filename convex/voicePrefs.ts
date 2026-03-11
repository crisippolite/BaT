import { action } from "./_generated/server";
import { v } from "convex/values";

// Parse a natural-language dream car description into structured preferences
export const parseVoiceToPrefs = action({
  args: {
    transcript: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const systemPrompt = `You are a BMW 2002 expert assistant. Parse the user's description of their dream BMW 2002 into structured preferences JSON.

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):

{
  "passFailCriteria": {
    "noStructuralRust": boolean,
    "pre1976": boolean,
    "cleanTitle": boolean
  },
  "bonusWeights": {
    "has_ac": number (0-10),
    "has_5_speed": number (0-10),
    "s14_swap": number (0-10),
    "widebody": number (0-10),
    "m42_swap": number (0-10),
    "recaro_seats": number (0-10),
    "track_suspension": number (0-10),
    "lightweight_wheels": number (0-10),
    "round_taillights": number (0-10),
    "ducktail_spoiler": number (0-10),
    "front_air_dam": number (0-10),
    "rebuilt_transmission": number (0-10),
    "custom_shifter": number (0-10)
  },
  "alerts": {
    "newMatch": boolean,
    "reserveRisk": boolean,
    "lastHour": boolean,
    "highSnipeRisk": boolean
  },
  "searchProfile": {
    "yearMin": number,
    "yearMax": number,
    "priceMax": number,
    "keywords": string[]
  },
  "summary": "A brief 1-2 sentence summary of what the user is looking for"
}

Scoring guide:
- 0 = don't care at all
- 1-3 = nice to have
- 4-6 = moderately important
- 7-8 = very important
- 9-10 = must have / dealbreaker

If the user mentions:
- Wanting A/C or air conditioning → high has_ac weight
- Track car, performance, handling → high track_suspension, lightweight_wheels
- Stock/original → low swap weights, higher originality focus
- Driver/fun car → balance of performance mods
- Specific colors → add to keywords
- Budget → set priceMax
- S14/M3 engine → high s14_swap
- 5-speed or Getrag → high has_5_speed
- Widebody or flares → high widebody
- Recaro or sport seats → high recaro_seats
- Round taillights / roundie → high round_taillights

Always enable all alerts by default unless the user says otherwise.
Always keep noStructuralRust: true and cleanTitle: true unless user explicitly says otherwise.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Here's what I'm looking for in a BMW 2002:\n\n"${args.transcript}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response into preferences");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  },
});
