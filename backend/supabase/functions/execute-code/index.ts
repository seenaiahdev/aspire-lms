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
    const { problemId, code, language } = await req.json();

    console.log(`Received code submission for problem ${problemId} in ${language}`);

    // Stub result representing sandbox compilation and testing
    const payload = {
      success: true,
      status: "solved",
      message: "All test cases passed!",
      testResults: [
        { testCase: "Basic case", status: "passed", stdout: "", expected: "Hello World", actual: "Hello World" }
      ],
      xpEarned: 10
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
