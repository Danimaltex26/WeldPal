/**
 * WeldPal Photo Analyzer — API Call Handler
 *
 * Wraps the Anthropic API call with:
 * - Correct model selection (always Sonnet for photo diagnosis)
 * - Structured JSON parsing and validation
 * - Retry logic for transient API errors
 * - Consistent error format for route handlers
 *
 * USAGE in route handler:
 *   import { analyzeWeldPhoto } from '../utils/weldAnalyzer.js';
 *
 *   const { analysis, usage } = await analyzeWeldPhoto({
 *     imageBase64: req.body.image,
 *     weldProcess: req.body.weldProcess,
 *     baseMaterial: req.body.baseMaterial,
 *     codeStandard: req.body.codeStandard,
 *     jointPosition: req.body.jointPosition,
 *     electrodeOrWire: req.body.electrodeOrWire,
 *     userNotes: req.body.userNotes
 *   });
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { WELDPAL_SYSTEM_PROMPT, buildWeldAnalysisMessage } from '../prompts/weldAnalysis.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Supabase client for usage logging (public schema, service role)
var supabaseLog = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseLog = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

var APP_NAME = process.env.APP_NAME || 'weldpal';

/**
 * Analyzes a weld photograph using Claude Sonnet vision.
 *
 * @param {object} params - See buildWeldAnalysisMessage for full param list
 * @returns {Promise<{analysis: object, usage: object, model: string}>}
 * @throws {object} Structured error object — check error.type for handling
 */
export async function analyzeWeldPhoto(params) {
  const {
    imageBase64,
    imageMediaType = 'image/jpeg',
    weldProcess,
    baseMaterial,
    codeStandard,
    jointPosition,
    electrodeOrWire,
    userNotes,
    userId
  } = params;

  // Validate required fields before calling API
  if (!imageBase64) {
    throw {
      type: 'validation_error',
      message: 'No image provided',
      userMessage: 'Please attach a photo before submitting.'
    };
  }

  const messages = buildWeldAnalysisMessage({
    imageBase64,
    imageMediaType,
    weldProcess,
    baseMaterial,
    codeStandard,
    jointPosition,
    electrodeOrWire,
    userNotes
  });

  // MODEL: claude-sonnet-4-20250514
  // Photo diagnosis always uses Sonnet — vision quality matters here.
  // Haiku is NOT acceptable for photo analysis — see model router strategy.
  // temperature: 0.2 — low for consistent, precise diagnosis
  // max_tokens: 1500 — thorough analysis needs room; 1024 was too tight

  let response;
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      attempt++;

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 0.2,
        system: WELDPAL_SYSTEM_PROMPT,
        messages: messages
      });

      break; // Success — exit retry loop

    } catch (apiError) {
      const isRetryable = apiError.status === 529 || apiError.status === 500;
      const isLastAttempt = attempt >= maxAttempts;

      if (isRetryable && !isLastAttempt) {
        console.warn(`[WeldPal Analyzer] API attempt ${attempt} failed (${apiError.status}). Retrying in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      // Not retryable or last attempt — throw structured error
      throw {
        type: 'api_error',
        status: apiError.status || 500,
        message: apiError.message || 'Claude API call failed',
        userMessage: apiError.status === 529
          ? 'Analysis service is temporarily busy. Please try again in a moment.'
          : 'Analysis failed. Please check your connection and try again.',
        isOverloaded: apiError.status === 529,
        isRateLimit: apiError.status === 429
      };
    }
  }

  // Parse JSON response
  // With this system prompt and Sonnet, the response should be
  // clean JSON. But always parse defensively.
  let analysis;
  const rawText = response.content[0].text.trim();

  try {
    // Handle edge case where model wraps JSON in code fences despite instructions
    const cleanText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    analysis = JSON.parse(cleanText);

  } catch (parseError) {
    // JSON parse failed — log for monitoring
    console.error('[WeldPal Analyzer] JSON parse failed:', rawText);
    throw {
      type: 'parse_error',
      message: 'Analysis response could not be processed',
      userMessage: 'The analysis could not be completed. Please try again.',
      raw: rawText
    };
  }

  // Validate the response has the critical field we gate on
  if (typeof analysis.is_weld_image === 'undefined') {
    console.error('[WeldPal Analyzer] Missing is_weld_image field:', analysis);
    throw {
      type: 'validation_error',
      message: 'Incomplete analysis returned — missing required fields',
      userMessage: 'The analysis was incomplete. Please try again.'
    };
  }

  // Log usage for cost tracking
  const isSonnet = response.model.includes('sonnet');
  const inputCost = (response.usage.input_tokens / 1_000_000) * (isSonnet ? 3.00 : 0.25);
  const outputCost = (response.usage.output_tokens / 1_000_000) * (isSonnet ? 15.00 : 1.25);
  const totalCost = inputCost + outputCost;

  if (process.env.NODE_ENV === 'development' || process.env.TRADEPAL_MODEL_LOGGING === 'true') {
    console.log(
      `[WeldPal Analyzer] ${isSonnet ? 'SONNET' : 'HAIKU'} | ` +
      `in:${response.usage.input_tokens} out:${response.usage.output_tokens} | ` +
      `~$${totalCost.toFixed(5)}`
    );
  }

  // Write to Supabase ai_usage_log (fire-and-forget)
  if (supabaseLog) {
    supabaseLog.from('ai_usage_log').insert({
      app_name: APP_NAME,
      feature: 'photo_diagnosis',
      model: response.model,
      is_sonnet: isSonnet,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      estimated_cost_usd: totalCost,
      user_id: userId || null,
    }).then(function (res) {
      if (res.error) console.error('[WeldPal Analyzer] Usage log error:', res.error.message);
    }).catch(function () {});
  }

  return {
    analysis,
    usage: response.usage,
    model: response.model
  };
}
