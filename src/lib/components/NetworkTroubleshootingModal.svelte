<script lang="ts">
	let { onclose }: { onclose?: () => void } = $props();

	function closeModal() {
		if (onclose) onclose();
	}

	function reloadPage() {
		window.location.reload();
	}

	function openExtensionsPage() {
		window.open('chrome://extensions/', '_blank');
	}

	function openApiKeyGuide() {
		window.open('https://github.com/JayJayBinks/infinite-tales-rpg/wiki/Create-your-free-Google-Gemini-API-Key-%F0%9F%94%91', '_blank');
	}
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
	<div class="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
		<div class="flex justify-between items-center mb-4">
			<h2 class="text-2xl font-bold text-gray-800">🔧 网络连接问题故障排除</h2>
			<button onclick={closeModal} class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
		</div>

		<div class="space-y-4 text-gray-700">
			<div class="bg-red-50 border-l-4 border-red-400 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">检测到网络连接问题</h3>
						<div class="mt-2 text-sm text-red-700">
							<p>Gemini API 连接失败，这通常是由浏览器扩展程序干扰或网络配置问题引起的。</p>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-blue-50 border-l-4 border-blue-400 p-4">
				<h3 class="text-lg font-semibold text-blue-800 mb-3">🔍 可能的原因</h3>
				<ul class="list-disc list-inside space-y-2 text-blue-700">
					<li><strong>浏览器扩展干扰：</strong> 广告拦截器、隐私保护扩展或其他网络拦截工具</li>
					<li><strong>网络连接问题：</strong> 不稳定的网络连接或超时</li>
					<li><strong>防火墙/代理：</strong> 企业防火墙或代理服务器阻止了API请求</li>
					<li><strong>API密钥问题：</strong> 密钥过期、无效或配额用尽</li>
				</ul>
			</div>

			<div class="bg-green-50 border-l-4 border-green-400 p-4">
				<h3 class="text-lg font-semibold text-green-800 mb-3">✅ 解决方案</h3>
				<div class="space-y-3">
					<div class="flex items-start space-x-3">
						<span class="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
						<div>
							<p class="font-medium text-green-800">刷新页面重试</p>
							<p class="text-green-700 text-sm">有时候临时的网络问题会自动解决</p>
							<button onclick={reloadPage} class="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors">
								🔄 刷新页面
							</button>
						</div>
					</div>

					<div class="flex items-start space-x-3">
						<span class="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
						<div>
							<p class="font-medium text-green-800">禁用浏览器扩展</p>
							<p class="text-green-700 text-sm">暂时禁用广告拦截器和隐私保护扩展</p>
							<button onclick={openExtensionsPage} class="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
								🔧 打开扩展管理
							</button>
						</div>
					</div>

					<div class="flex items-start space-x-3">
						<span class="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
						<div>
							<p class="font-medium text-green-800">检查API密钥</p>
							<p class="text-green-700 text-sm">确保您的Gemini API密钥有效且未过期</p>
							<button onclick={openApiKeyGuide} class="mt-2 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors">
								📖 API密钥指南
							</button>
						</div>
					</div>

					<div class="flex items-start space-x-3">
						<span class="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
						<div>
							<p class="font-medium text-green-800">尝试其他网络</p>
							<p class="text-green-700 text-sm">如果在企业网络中，尝试使用手机热点或家庭网络</p>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
				<h3 class="text-lg font-semibold text-yellow-800 mb-2">💡 高级故障排除</h3>
				<ul class="list-disc list-inside space-y-1 text-yellow-700 text-sm">
					<li>打开浏览器开发者工具 (F12) 查看网络错误详情</li>
					<li>尝试在隐身/无痕模式下访问</li>
					<li>清除浏览器缓存和Cookie</li>
					<li>检查系统防火墙设置</li>
					<li>如果使用VPN，尝试断开连接</li>
				</ul>
			</div>

			<div class="text-center pt-4">
				<p class="text-gray-600 text-sm">如果问题仍然存在，请在Discord社区寻求帮助</p>
				<button onclick={closeModal} class="mt-3 bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors">
					关闭
				</button>
			</div>
		</div>
	</div>
</div>