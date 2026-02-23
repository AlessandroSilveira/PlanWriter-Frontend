export function getAuthFriendlyMessage(error, fallbackMessage) {
  const fallback = fallbackMessage || "Não foi possível concluir o login. Tente novamente.";
  const status = error?.response?.status;

  if (status === 401) {
    return "Não foi possível entrar. Confira e-mail e senha e tente novamente.";
  }

  if (status === 403) {
    return "Sua conta não tem permissão para acessar esta área.";
  }

  if (status === 429) {
    return "Muitas tentativas de login. Aguarde um minuto e tente novamente.";
  }

  if (typeof status === "number" && status >= 500) {
    return "Estamos com instabilidade no servidor. Tente novamente em instantes.";
  }

  const apiMessage = error?.response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage;
  }

  const apiTitle = error?.response?.data?.title;
  if (typeof apiTitle === "string" && apiTitle.trim()) {
    return apiTitle;
  }

  const rawMessage = error?.message;
  if (typeof rawMessage === "string" && /^Request failed with status code \d+$/i.test(rawMessage)) {
    return fallback;
  }

  if (typeof rawMessage === "string" && rawMessage.trim()) {
    return rawMessage;
  }

  return fallback;
}

function extractValidationMessages(error) {
  const errors = error?.response?.data?.errors;
  if (!errors || typeof errors !== "object") return [];

  return Object.values(errors)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((message) => (typeof message === "string" ? message.trim() : ""))
    .filter(Boolean);
}

export function getRegisterFriendlyMessage(error, fallbackMessage) {
  const fallback = fallbackMessage || "Não foi possível concluir o cadastro. Tente novamente.";
  const status = error?.response?.status;

  if (status === 400) {
    const validationMessages = extractValidationMessages(error);
    if (validationMessages.length > 0) {
      return validationMessages[0];
    }
  }

  if (status === 409) {
    return "Já existe uma conta com esse e-mail.";
  }

  if (typeof status === "number" && status >= 500) {
    return "Estamos com instabilidade no servidor. Tente novamente em instantes.";
  }

  const apiMessage = error?.response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage;
  }

  const apiTitle = error?.response?.data?.title;
  if (typeof apiTitle === "string" && apiTitle.trim()) {
    return apiTitle;
  }

  const rawMessage = error?.message;
  if (typeof rawMessage === "string" && /^Request failed with status code \d+$/i.test(rawMessage)) {
    return fallback;
  }

  if (typeof rawMessage === "string" && rawMessage.trim()) {
    return rawMessage;
  }

  return fallback;
}
