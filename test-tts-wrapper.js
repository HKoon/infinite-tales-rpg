/**
 * TTS 包装器测试脚本
 * 用于验证 SafeMsEdgeTTS 是否正确处理流取消和错误
 */

import { SafeMsEdgeTTS } from '../src/lib/utils/ttsWrapper.js';
import { OUTPUT_FORMAT } from 'msedge-tts';

async function testTTSWrapper() {
    console.log('🧪 开始测试 SafeMsEdgeTTS 包装器...');
    
    const tts = new SafeMsEdgeTTS();
    
    try {
        // 测试 1: 基本功能
        console.log('📝 测试 1: 基本 TTS 功能');
        await tts.setMetadata('de-DE-SeraphinaMultilingualNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        console.log('✅ TTS 元数据设置成功');
        
        // 测试 2: 流创建和快速取消
        console.log('📝 测试 2: 流创建和快速取消');
        const result = tts.toStream('Hello, this is a test message.');
        console.log(`✅ 流创建成功，requestId: ${result.requestId}`);
        console.log(`📊 活动流数量: ${tts.getActiveStreamCount()}`);
        
        // 立即销毁流来模拟取消
        setTimeout(() => {
            console.log('🔄 销毁流...');
            result.audioStream.destroy();
        }, 100);
        
        // 等待一段时间观察是否有错误
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`📊 销毁后活动流数量: ${tts.getActiveStreamCount()}`);
        
        // 测试 3: 获取语音列表
        console.log('📝 测试 3: 获取语音列表');
        const voices = await tts.getVoices();
        console.log(`✅ 成功获取 ${voices.length} 个语音`);
        
        // 测试 4: 清理
        console.log('📝 测试 4: 清理资源');
        tts.close();
        console.log(`✅ TTS 实例已关闭，状态: ${tts.isActive() ? '活动' : '已关闭'}`);
        
        console.log('🎉 所有测试通过！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        tts.close();
    }
}

// 运行测试
testTTSWrapper().catch(console.error);