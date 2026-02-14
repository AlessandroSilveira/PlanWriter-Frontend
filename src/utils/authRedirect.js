function decodeJwtPayload(token) {
  const payloadBase64Url = token.split(".")[1];
  if (!payloadBase64Url) return null;

  const base64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return JSON.parse(atob(padded));
}

function parseBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function isAdminFromRole(roleClaim) {
  if (typeof roleClaim === "string") {
    return roleClaim.toLowerCase() === "admin";
  }
  if (Array.isArray(roleClaim)) {
    return roleClaim.some((value) => typeof value === "string" && value.toLowerCase() === "admin");
  }
  return false;
}

export function resolvePostAuthPath(token, fallback = "/dashboard") {
  if (typeof token !== "string" || token.trim().length === 0) {
    return fallback;
  }

  try {
    const decoded = decodeJwtPayload(token) || {};

    const mustChangePassword = parseBool(
      decoded.mustChangePassword ??
      decoded.MustChangePassword ??
      decoded.must_change_password
    );

    const isAdmin =
      parseBool(decoded.isAdmin ?? decoded.IsAdmin ?? decoded.is_admin) ||
      isAdminFromRole(
        decoded.role ??
        decoded.roles ??
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]
      );

    if (mustChangePassword) return "/change-password";
    if (isAdmin) return "/admin/events";
    return fallback;
  } catch {
    return fallback;
  }
}
