// Run this in browser console to check cached data
const cached = sessionStorage.getItem('loca_results_state');
if (cached) {
  const parsed = JSON.parse(cached);
  console.log('Cached results:', parsed.results.length);
  parsed.results.forEach((r, i) => {
    console.log(`${i+1}. ${r.place.displayName}:`, {
      hasReasoning: !!r.reasoning,
      reasoning: r.reasoning?.substring(0, 50),
      hasImageAnalysis: !!r.imageAnalysis,
      imageAnalysis: r.imageAnalysis,
      reasoningType: typeof r.reasoning,
      imageAnalysisType: typeof r.imageAnalysis,
    });
  });
}
