/**
 * Deep merge utility for agent_logic objects
 * Handles arrays by concatenating unique values, objects by deep merging
 */
export function deepMergeAgentLogic(target: any, source: any): any {
  console.log('🔧 deepMergeAgentLogic called with:')
  console.log('🔧 Target (existing):', JSON.stringify(target, null, 2))
  console.log('🔧 Source (changes):', JSON.stringify(source, null, 2))
  
  if (!target || typeof target !== 'object') {
    console.log('🔧 Target is not object, returning source')
    return source
  }
  
  if (!source || typeof source !== 'object') {
    console.log('🔧 Source is not object, returning target')
    return target
  }

  const result = { ...target }
  console.log('🔧 Initial result (copy of target):', JSON.stringify(result, null, 2))

  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = result[key]
    
    console.log(`🔧 Processing key "${key}":`)
    console.log(`🔧   - sourceValue:`, sourceValue)
    console.log(`🔧   - targetValue:`, targetValue)

    if (Array.isArray(sourceValue)) {
      if (Array.isArray(targetValue)) {
        // Merge arrays, removing duplicates
        const combined = [...targetValue, ...sourceValue]
        result[key] = [...new Set(combined)]
        console.log(`🔧   - Array merge result:`, result[key])
      } else {
        result[key] = [...sourceValue]
        console.log(`🔧   - Array replace result:`, result[key])
      }
    } else if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      // Recursively merge objects
      console.log(`🔧   - Recursively merging object for key "${key}"`)
      result[key] = deepMergeAgentLogic(targetValue || {}, sourceValue)
      console.log(`🔧   - Recursive merge result for "${key}":`, result[key])
    } else {
      // Primitive values - source overwrites target
      result[key] = sourceValue
      console.log(`🔧   - Primitive overwrite result for "${key}":`, result[key])
    }
  }

  console.log('🔧 Final merge result:', JSON.stringify(result, null, 2))
  return result
}

/**
 * Get default agent_logic structure
 */
export function getDefaultAgentLogic() {
  return {
    version: "2.0",
    formatting: {
      preserve_template_punctuation: true,
      use_bullet_points: false,
      capitalize_sections: true
    },
    report: {
      no_hallucinated_findings: true,
      include_technique_section: false,
      expand_lesions: false
    },
    impression: {
      numerically_itemized: true,
      omit_minor_or_incidental_findings_unless_relevant: false,
      concise_summary: false,
      include_recommendations: false,
      first_item_should_address_clinical_concern: false,
      exclude_by_default: [
        "small_joint_effusion",
        "small_joint_effusions",
        "trace_joint_effusion",
        "trace_bursitis",
        "mild_tendinosis",
        "minimal_degenerative_changes",
        "small_baker_cyst",
        "small_bakers_cyst",
        "small_baker's_cyst",
        "small_baker's_cysts",
        "mild_bone_marrow_edema",
        "minimal_synovitis",
        "trace_fluid"
      ],
      mention_muscle_atrophy_if: "moderate_or_severe"
    },
    anatomy: {
      combine_meniscus_and_cartilage_findings: false,
      group_by_anatomic_region: false
    },
    clinical: {
      correlate_with_symptoms: false,
      mention_clinical_significance: false
    },
    measurements: {
      include_all_measurements: true,
      use_metric_system: true
    },
    severity: {
      use_standard_grading: false,
      avoid_vague_terms: false
    },
    style: {
      active_voice: false,
      professional_tone: true
    },
    custom_instructions: []
  }
}