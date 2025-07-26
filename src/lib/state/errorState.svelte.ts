class ErrorState {
	userMessage = $state();
	code = $state();
	exception = $state();
	retryable = $state();
	isNetworkError = $state(false);
	showTroubleshooting = $state(false);

	clear = () => {
		this.userMessage = undefined;
		this.code = undefined;
		this.exception = undefined;
		this.retryable = undefined;
		this.isNetworkError = false;
		this.showTroubleshooting = false;
	};

	setNetworkError = (message: string) => {
		this.userMessage = message;
		this.isNetworkError = true;
		this.retryable = true;
		this.showTroubleshooting = true;
	};
}

export const errorState = new ErrorState();

let isGeminiThinkingOverloaded = $state(false);

export const getIsGeminiThinkingOverloaded = () => {
	return isGeminiThinkingOverloaded;
};

export const setIsGeminiThinkingOverloaded = (value: boolean) => {
	isGeminiThinkingOverloaded = value;
};

let isGeminiFlashExpOverloaded = $state(false);

export const getIsGeminiFlashExpOverloaded = () => {
	return isGeminiFlashExpOverloaded;
};

export const setIsGeminiFlashExpOverloaded = (value: boolean) => {
	isGeminiFlashExpOverloaded = value;
};
