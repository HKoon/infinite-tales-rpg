/**
 * msedge-tts 运行时补丁
 * 修复 _streams[requestId] 未定义导致的 TypeError
 */

import { MsEdgeTTS } from 'msedge-tts';

// 保存原始的 _pushAudioData 方法
const originalPushAudioData = MsEdgeTTS.prototype._pushAudioData;
const originalPushMetadata = MsEdgeTTS.prototype._pushMetadata;

// 修补 _pushAudioData 方法
MsEdgeTTS.prototype._pushAudioData = function(requestId: string, data: any) {
    try {
        // 检查 _streams[requestId] 是否存在
        if (!this._streams || !this._streams[requestId]) {
            console.warn(`⚠️  TTS 流 ${requestId} 已被清理，忽略音频数据`);
            return;
        }
        
        // 检查 audio 属性是否存在
        if (!this._streams[requestId].audio) {
            console.warn(`⚠️  TTS 流 ${requestId} 的音频流已被清理，忽略音频数据`);
            return;
        }
        
        // 调用原始方法
        return originalPushAudioData.call(this, requestId, data);
    } catch (error) {
        console.error(`🚨 TTS _pushAudioData 错误 (${requestId}):`, error);
        // 不重新抛出错误，防止应用崩溃
    }
};

// 修补 _pushMetadata 方法
MsEdgeTTS.prototype._pushMetadata = function(requestId: string, data: any) {
    try {
        // 检查 _streams[requestId] 是否存在
        if (!this._streams || !this._streams[requestId]) {
            console.warn(`⚠️  TTS 流 ${requestId} 已被清理，忽略元数据`);
            return;
        }
        
        // 检查 metadata 属性是否存在
        if (!this._streams[requestId].metadata) {
            console.warn(`⚠️  TTS 流 ${requestId} 的元数据流已被清理，忽略元数据`);
            return;
        }
        
        // 调用原始方法
        return originalPushMetadata.call(this, requestId, data);
    } catch (error) {
        console.error(`🚨 TTS _pushMetadata 错误 (${requestId}):`, error);
        // 不重新抛出错误，防止应用崩溃
    }
};

console.log('🛡️  msedge-tts 运行时补丁已应用');

export { MsEdgeTTS };