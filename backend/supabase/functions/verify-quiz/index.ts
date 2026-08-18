import { serve } from "https://deno.land/std@0.168/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { quizId, answers } = await req.json();

    console.log(`Received quiz submission for quiz ${quizId}`);

    // Stub result for quiz evaluation
    const score = 90;
    const maxScore = 100;
    const passed = score >= 70;

    const payload = {
      success: true,
      score,
      maxScore,
      passed,
      feedback: passed ? "Great job! You passed the quiz." : "You did not achieve the passing score. Please review the material and try again."
    };

    return new Response(
      JSON.stringify(payload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
