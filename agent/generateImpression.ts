// Remove direct supabase import - will use IPC instead
import { AgentLogic } from './types'
import buildImpressionPrompt from './buildImpressionPrompt'
import buildEnhancedImpressionPrompt from './buildEnhancedImpressionPrompt'
import validateRules from './validateRules'
import callModel, { ModelCallResponse } from './callModel'
import { postProcessImpression } from './postProcessImpression'

// Helper function to get template data via IPC
async function getTemplateViaIPC(userId: string, studyType: string) {
  // Use IPC bridge to get template data from main process
  const result = await window.electron?.ipcRenderer?.invoke('fetch-template-for-generation', userId, studyType)
  
  if (!result || result.error) {
    throw new Error(result?.error || `No template found for user ${userId} and study type "${studyType}"`)
  }
  
  return result.data
}

export default async function generateImpression({
  userId,
  studyType,
  findings,
  model
}: {
  userId: string
  studyType: string  // studyType is required
  findings: string
  model?: string
}): Promise<ModelCallResponse> {
  try {
    // Query templates table via IPC to avoid TLS inspection issues
    const data = await getTemplateViaIPC(userId, studyType)
    
    if (!data) {
      throw new Error(`No template found for user ${userId} and study type "${studyType}"`)
    }
    
    const { template, agent_logic: agentLogic, generate_impression } = data
    
    // If no agent_logic exists, create fallback logic from the old generate_impression
    let finalAgentLogic = agentLogic
    if (!agentLogic && generate_impression) {
      console.log('🔄 Using fallback: converting generate_impression to agent_logic')
      finalAgentLogic = {
        instructions: generate_impression,
        version: "1.0_fallback",
        impression: {
          concise_summary: true
        }
      }
    }
    
    // Build the prompt using enhanced logic for better formatting and compliance
    const useEnhancedPrompt = true // Toggle this to compare old vs new prompts
    const prompt = useEnhancedPrompt 
      ? buildEnhancedImpressionPrompt(findings, template || '', finalAgentLogic || {})
      : buildImpressionPrompt(findings, template || '', finalAgentLogic || {})
    
    console.log('🎯 Using enhanced impression prompt for better formatting and rule compliance')
    
    // Call the model with the composed prompt
    const modelOutput = await callModel({ prompt, model })
    
    // POST-PROCESS: Apply strict exclusion rules to the generated text
    console.log('🔧 Post-processing impression to enforce exclusion rules...')
    const processedText = postProcessImpression(modelOutput.text, finalAgentLogic || {})
    
    // Check if post-processing removed anything
    if (processedText !== modelOutput.text) {
      console.log('✂️ Post-processing removed excluded items from impression')
    }
    
    // Update the model output with processed text
    modelOutput.text = processedText
    
    // Validate rule compliance for impressions
    const ruleValidation = validateRules(processedText, findings, finalAgentLogic || {})
    
    if (!ruleValidation.passed) {
      console.error('🚨 Impression rule validation failed:', ruleValidation.violations)
      
      // Log violations for debugging
      ruleValidation.violations.forEach(violation => {
        console.error('❌ IMPRESSION RULE VIOLATION:', violation)
      })
    } else {
      console.log('✅ All impression rules validated successfully')
    }
    
    if (ruleValidation.warnings.length > 0) {
      console.warn('⚠️ Impression rule warnings:', ruleValidation.warnings)
    }
    
    return {
      ...modelOutput,
      ruleViolations: ruleValidation.violations,
      ruleWarnings: ruleValidation.warnings
    }
  } catch (error) {
    console.error('Error generating impression:', error)
    throw error
  }
}