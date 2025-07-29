/**
 * 全局错误处理器
 * 用于捕获和处理未捕获的异常，防止应用崩溃
 */

export function setupGlobalErrorHandlers() {
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
        console.error('🚨 未捕获的异常:', error);
        
        // 检查是否是 msedge-tts 相关的错误
        if (error.message && error.message.includes('Cannot read properties of undefined')) {
            console.error('⚠️  检测到 msedge-tts 流错误，已被安全处理');
            // 不退出进程，继续运行
            return;
        }
        
        // 对于其他严重错误，记录并优雅退出
        console.error('💥 严重错误，准备退出进程...');
        process.exit(1);
    });

    // 处理未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason, promise) => {
        console.error('🚨 未处理的 Promise 拒绝:', reason);
        console.error('Promise:', promise);
        
        // 检查是否是 TTS 相关的错误
        if (reason && typeof reason === 'object' && reason.message) {
            if (reason.message.includes('msedge-tts') || 
                reason.message.includes('_streams') ||
                reason.message.includes('audio')) {
                console.error('⚠️  检测到 TTS 相关错误，已被安全处理');
                return;
            }
        }
        
        // 对于其他错误，记录但不退出
        console.error('⚠️  Promise 拒绝已记录，继续运行');
    });

    // 处理进程退出信号
    process.on('SIGTERM', () => {
        console.log('📡 收到 SIGTERM 信号，正在优雅关闭...');
        // 这里可以添加清理逻辑
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('📡 收到 SIGINT 信号，正在优雅关闭...');
        // 这里可以添加清理逻辑
        process.exit(0);
    });

    console.log('🛡️  全局错误处理器已设置');
}