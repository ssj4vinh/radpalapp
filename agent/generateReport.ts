// Remove direct supabase import - will use IPC instead
import { AgentLogic } from './types'
import buildPrompt from './buildPrompt'
import buildEnhancedPrompt from './buildEnhancedPrompt'
import validateRules from './validateRules'
import callModel, { ModelCallResponse } from './callModel'
import { validateSectionHeaders, ensureSectionHeaders } from './validateSectionHeaders'

// Helper function to get template data via IPC
async function getTemplateViaIPC(userId: string, studyType: string) {
  // Use IPC bridge to get template data from main process
  const result = await window.electron?.ipcRenderer?.invoke('fetch-template-for-generation', userId, studyType)
  
  if (!result || result.error) {
    throw new Error(result?.error || `No template found for user ${userId} and study type "${studyType}"`)
  }
  
  return result.data
}

export default async function generateReport({
  userId,
  studyType,
  findings,
  model
}: {
  userId: string
  studyType: string
  findings: string
  model?: string
}): Promise<ModelCallResponse> {
  console.log('🤖 Agent generateReport called:', { 
    userId, 
    studyType, 
    findingsLength: findings.length + ' characters',
    findingsPreview: findings.substring(0, 100) + '...', 
    model 
  })
  
  try {
    // Query templates table via IPC to avoid TLS inspection issues
    const data = await getTemplateViaIPC(userId, studyType)
    
    if (!data) {
      throw new Error(`No template found for user ${userId} and study type "${studyType}"`)
    }
    
    const { template, agent_logic: agentLogic, generate_prompt } = data
    
    // If no agent_logic exists, create fallback logic from the old generate_prompt
    let finalAgentLogic = agentLogic
    if (!agentLogic && generate_prompt) {
      console.log('🔄 Using fallback: converting generate_prompt to agent_logic')
      finalAgentLogic = {
        instructions: generate_prompt,
        version: "1.0_fallback"
      }
    }
    
    if (!template) {
      throw new Error(`Template is empty for study type "${studyType}"`)
    }
    
    // Build the prompt using enhanced logic for better rule compliance
    const useEnhancedPrompt = true // Toggle this to compare old vs new prompts
    const prompt = useEnhancedPrompt 
      ? buildEnhancedPrompt(findings, template, finalAgentLogic || {})
      : buildPrompt(findings, template, finalAgentLogic || {})
    
    console.log('🎯 Using enhanced prompt for better rule compliance')
    
    // Call the model with the composed prompt
    const modelOutput = await callModel({ prompt, model })
    
    // Validate section headers in the generated report
    const headerValidation = validateSectionHeaders(template, modelOutput.text)
    let finalReport = modelOutput.text
    
    if (!headerValidation.valid) {
      console.warn('⚠️ Section header validation failed:', headerValidation)
      finalReport = ensureSectionHeaders(template, modelOutput.text)
    }
    
    // Validate rule compliance
    const ruleValidation = validateRules(finalReport, findings, finalAgentLogic || {})
    
    if (!ruleValidation.passed) {
      console.error('🚨 Rule validation failed:', ruleValidation.violations)
      
      // Log violations for debugging
      ruleValidation.violations.forEach(violation => {
        console.error('❌ RULE VIOLATION:', violation)
      })
      
      // Add violations as metadata (could be shown to user)
      return {
        ...modelOutput,
        text: finalReport,
        ruleViolations: ruleValidation.violations,
        ruleWarnings: ruleValidation.warnings
      }
    } else {
      console.log('✅ All rules validated successfully')
    }
    
    if (ruleValidation.warnings.length > 0) {
      console.warn('⚠️ Rule warnings:', ruleValidation.warnings)
    }
    
    return {
      ...modelOutput,
      text: finalReport,
      ruleViolations: ruleValidation.violations,
      ruleWarnings: ruleValidation.warnings
    }
  } catch (error) {
    console.error('Error generating report:', error)
    throw error
  }
}