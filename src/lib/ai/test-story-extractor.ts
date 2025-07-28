/**
 * 测试story提取器对复杂JSON格式的处理能力
 */
import { AdvancedStoryExtractor, OpenAIStreamStoryExtractor } from './openaiStreamStoryExtractor.js';

// 模拟你提供的复杂JSON响应
const complexJsonResponse = `{
  "message": { 
    "role": "assistant", 
    "content": "[\\n  {\\n    \\"characterName\\": \\"Kara Venn\\",\\n    \\"plausibility\\": \\"Kara's stealth skills, jungle familiarity, and cloak make silent reconnaissance logical and fitting her cautious nature.\\",\\n    \\"text\\": \\"Lead a silent reconnaissance around the perimeter wearing the enviro camouflage cloak to avoid detection.\\",\\n    \\"type\\": \\"Travel\\",\\n    \\"related_attribute\\": \\"Dexterity\\",\\n    \\"existing_related_skill_explanation\\": \\"Utilizes Kara's jungle survival and stealth skills enhanced by the cloak's bioluminescent pattern mimicry.\\",\\n    \\"related_skill\\": \\"Stealth\\",\\n    \\"difficulty_explanation\\": \\"Chose medium because dense jungle and imperial patrols require careful movement but cloak grants advantage.\\",\\n    \\"action_difficulty\\": \\"medium\\",\\n    \\"is_possible\\": true,\\n    \\"resource_cost\\": null,\\n    \\"narration_details\\": {\\"reasoning\\": \\"Requires observing patrols and animal activity closely to avoid detection.\\", \\"enum_english\\": \\"MEDIUM\\"},\\n    \\"actionSideEffects\\": \\"Minimal; evading detection avoids alerting imperial patrols, maintaining element of surprise.\\",\\n    \\"enemyEncounterExplanation\\": {\\"reasoning\\": \\"Moderate chance of accidental patrol encounter, Imperial scouts actively monitoring area.\\", \\"enum_english\\": \\"MEDIUM\\"},\\n    \\"is_interruptible\\": {\\"reasoning\\": \\"Medium chance as patrols or noises could force sudden evasion or hiding.\\", \\"enum_english\\": \\"MEDIUM\\"},\\n    \\"dice_roll\\": {\\n      \\"modifier_explanation\\": \\"The enviro camouflage cloak's fibers grant a bonus by blending Kara into bioluminescent flora.\\",\\n      \\"modifier\\": \\"bonus\\",\\n      \\"modifier_value\\": 2\\n    }\\n  }\\n]" 
  },
  "story": "Kara adjusts the enviro camouflage cloak around her shoulders, feeling the bio-responsive fibers shift and shimmer as they begin to mimic the bioluminescent patterns of the surrounding jungle flora. The cloak's adaptive technology hums softly against her skin, synchronizing with the natural rhythms of the forest. She signals to Jek and Zara to remain hidden while she scouts ahead, her movements becoming fluid and deliberate as years of survival training take over. The dense canopy above filters the harsh daylight into dappled shadows, perfect cover for her reconnaissance mission. As she moves through the undergrowth, the cloak's camouflage adjusts continuously, making her nearly invisible against the backdrop of glowing fungi and phosphorescent vines."
}`;

// 模拟简单的story字段JSON
const simpleJsonResponse = `{
  "story": "This is a simple story content that should be extracted properly.",
  "other_field": "This should be ignored"
}`;

// 测试函数
export function testStoryExtractors() {
  console.log('🧪 Testing Story Extractors...');
  
  // 测试高级提取器处理复杂JSON
  console.log('\n📋 Testing AdvancedStoryExtractor with complex JSON:');
  testAdvancedExtractor(complexJsonResponse);
  
  // 测试高级提取器处理简单JSON
  console.log('\n📋 Testing AdvancedStoryExtractor with simple JSON:');
  testAdvancedExtractor(simpleJsonResponse);
  
  // 测试基础提取器
  console.log('\n📋 Testing OpenAIStreamStoryExtractor:');
  testBasicExtractor(simpleJsonResponse);
}

function testAdvancedExtractor(jsonResponse: string) {
  let extractedStory = '';
  let isComplete = false;
  
  const extractor = new AdvancedStoryExtractor((chunk: string, complete: boolean) => {
    if (chunk) {
      extractedStory += chunk;
      console.log('📝 Story chunk:', chunk);
    }
    if (complete) {
      isComplete = true;
      console.log('✅ Story extraction completed');
    }
  });
  
  // 模拟流式输入，逐字符处理
  const chunks = jsonResponse.match(/.{1,10}/g) || []; // 分成10字符的块
  
  for (const chunk of chunks) {
    extractor.processChunk(chunk);
  }
  
  extractor.forceComplete();
  
  console.log('🎯 Final extracted story:', extractedStory);
  console.log('📊 Story length:', extractedStory.length);
  console.log('🏁 Is complete:', isComplete);
}

function testBasicExtractor(jsonResponse: string) {
  let extractedStory = '';
  let isComplete = false;
  
  const extractor = new OpenAIStreamStoryExtractor((chunk: string, complete: boolean) => {
    if (chunk) {
      extractedStory += chunk;
      console.log('📝 Story chunk:', chunk);
    }
    if (complete) {
      isComplete = true;
      console.log('✅ Story extraction completed');
    }
  });
  
  // 模拟流式输入
  const chunks = jsonResponse.match(/.{1,10}/g) || [];
  
  for (const chunk of chunks) {
    extractor.processChunk(chunk);
  }
  
  extractor.forceComplete();
  
  console.log('🎯 Final extracted story:', extractedStory);
  console.log('📊 Story length:', extractedStory.length);
  console.log('🏁 Is complete:', isComplete);
}