/**
 * IPC handlers for enhanced agent logic with inheritance
 * To be imported and registered in main.js
 */

const { ipcMain } = require('electron');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (will be set from main.js)
let supabase = null;

function initSupabase(supabaseUrl, supabaseKey) {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
}

// Default logic structure
function getDefaultAgentLogic() {
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
  };
}

// Deep merge utility
function deepMergeLogic(target, source) {
  if (!target || typeof target !== 'object') return source;
  if (!source || typeof source !== 'object') return target;
  
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (Array.isArray(sourceValue)) {
      if (Array.isArray(targetValue)) {
        // Merge arrays, removing duplicates
        const combined = [...targetValue, ...sourceValue];
        result[key] = [...new Set(combined)];
      } else {
        result[key] = [...sourceValue];
      }
    } else if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      // Recursively merge objects
      result[key] = deepMergeLogic(targetValue || {}, sourceValue);
    } else {
      // Primitive values - source overwrites target
      result[key] = sourceValue;
    }
  }
  
  return result;
}

// Register IPC handlers
function registerHandlers() {
  // Fetch merged logic for report generation
  ipcMain.handle('fetch-merged-logic', async (event, userId, studyType) => {
    try {
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }
      
      // Get template with study-specific logic
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('agent_logic')
        .eq('user_id', userId)
        .eq('study_type', studyType)
        .single();
      
      if (templateError && templateError.code !== 'PGRST116') {
        throw templateError;
      }
      
      // Get base logic (from any template with default_agent_logic)
      const { data: baseTemplate, error: baseError } = await supabase
        .from('templates')
        .select('default_agent_logic')
        .eq('user_id', userId)
        .not('default_agent_logic', 'is', null)
        .limit(1)
        .single();
      
      // Start with system default
      let mergedLogic = getDefaultAgentLogic();
      
      // Apply user's base logic if exists
      if (baseTemplate?.default_agent_logic) {
        mergedLogic = deepMergeLogic(mergedLogic, baseTemplate.default_agent_logic);
      }
      
      // Apply study-specific logic if exists
      if (template?.agent_logic) {
        mergedLogic = deepMergeLogic(mergedLogic, template.agent_logic);
      }
      
      return {
        success: true,
        mergedLogic,
        hasBaseLogic: !!baseTemplate?.default_agent_logic,
        hasStudyLogic: !!template?.agent_logic
      };
    } catch (error) {
      console.error('Error fetching merged logic:', error);
      return {
        error: error.message,
        mergedLogic: getDefaultAgentLogic() // Fallback to default
      };
    }
  });
  
  // Note: fetch-template-for-generation is already handled by supabasebridge.js
  // We'll enhance it separately if needed
  
  // Update base logic
  ipcMain.handle('update-base-logic', async (event, userId, baseLogic) => {
    try {
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }
      
      const { error } = await supabase
        .from('templates')
        .update({ 
          default_agent_logic: baseLogic,
          default_agent_logic_updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error updating base logic:', error);
      return { error: error.message };
    }
  });
  
  // Update study-specific logic
  ipcMain.handle('update-study-logic', async (event, userId, studyType, studyLogic) => {
    try {
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }
      
      const { error } = await supabase
        .from('templates')
        .update({ 
          agent_logic: studyLogic,
          agent_logic_updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('study_type', studyType);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error updating study logic:', error);
      return { error: error.message };
    }
  });
  
  // Get current logic layers
  ipcMain.handle('get-logic-layers', async (event, userId, studyType) => {
    try {
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }
      
      // Get study-specific logic
      const { data: template } = await supabase
        .from('templates')
        .select('agent_logic, agent_logic_updated_at')
        .eq('user_id', userId)
        .eq('study_type', studyType)
        .single();
      
      // Get base logic
      const { data: baseTemplate } = await supabase
        .from('templates')
        .select('default_agent_logic, default_agent_logic_updated_at')
        .eq('user_id', userId)
        .not('default_agent_logic', 'is', null)
        .limit(1)
        .single();
      
      return {
        success: true,
        defaultLogic: getDefaultAgentLogic(),
        baseLogic: baseTemplate?.default_agent_logic || null,
        studyLogic: template?.agent_logic || null,
        lastUpdated: {
          base: baseTemplate?.default_agent_logic_updated_at,
          study: template?.agent_logic_updated_at
        }
      };
    } catch (error) {
      console.error('Error getting logic layers:', error);
      return {
        error: error.message,
        defaultLogic: getDefaultAgentLogic()
      };
    }
  });
}

module.exports = {
  initSupabase,
  registerHandlers,
  getDefaultAgentLogic
};