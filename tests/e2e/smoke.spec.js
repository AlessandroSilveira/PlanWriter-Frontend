import { expect, test } from "@playwright/test";

function createJwt(user = {}) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");

  const payload = Buffer.from(
    JSON.stringify({
      nameid: user.id ?? "user-1",
      sub: user.id ?? "user-1",
      email: user.email ?? "writer@planwriter.test",
      isAdmin: !!user.isAdmin,
      mustChangePassword: !!user.mustChangePassword,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    })
  ).toString("base64url");

  return `${header}.${payload}.signature`;
}

function createAuthSession(user = {}) {
  return {
    accessToken: createJwt(user),
    refreshToken: "refresh-token-test",
    refreshTokenExpiresAtUtc: new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString(),
  };
}

function createMockState() {
  const user = {
    id: "user-1",
    email: "writer@planwriter.test",
    isAdmin: false,
    mustChangePassword: false,
  };

  const project = {
    id: "project-1",
    title: "Projeto Base",
    description: "Projeto inicial",
    genre: "Romance",
    wordCountGoal: 50000,
    currentWordCount: 1200,
    status: "ONGOING",
  };

  return {
    user,
    authSession: createAuthSession(user),
    projects: [project],
    statsByProjectId: {
      "project-1": {
        totalWords: 1200,
        averagePerDay: 300,
        activeDays: 3,
        bestDay: {
          date: "2026-02-27T00:00:00Z",
          words: 500,
        },
      },
    },
    historyByProjectId: {
      "project-1": [
        {
          date: "2026-02-26T00:00:00Z",
          wordsWritten: 200,
          createdAt: "2026-02-26T10:00:00Z",
        },
        {
          date: "2026-02-27T00:00:00Z",
          wordsWritten: 500,
          createdAt: "2026-02-27T10:00:00Z",
        },
      ],
    },
    myEvents: [],
    activeEvents: [],
    progressPosts: [],
  };
}

async function seedAuthenticatedSession(page, state) {
  const session = state.authSession;
  await page.addInitScript((seed) => {
    window.localStorage.setItem("pw_access_token", seed.accessToken);
    window.localStorage.setItem("pw_refresh_token", seed.refreshToken);
    window.localStorage.setItem(
      "pw_refresh_token_expires_at_utc",
      seed.refreshTokenExpiresAtUtc
    );
  }, session);
}

async function installApiMocks(page, state) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (!pathname.startsWith("/api/")) {
      return route.continue();
    }

    const method = request.method();

    const fulfillJson = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });

    if (pathname === "/api/auth/login" && method === "POST") {
      return fulfillJson(state.authSession);
    }

    if (pathname === "/api/auth/refresh" && method === "POST") {
      return fulfillJson(state.authSession);
    }

    if (pathname === "/api/profile/me" && method === "GET") {
      return fulfillJson(state.user);
    }

    if (pathname === "/api/projects" && method === "GET") {
      return fulfillJson(state.projects);
    }

    if (pathname === "/api/projects" && method === "POST") {
      const body = request.postDataJSON();
      const created = {
        id: `project-${state.projects.length + 1}`,
        title: body.title,
        description: body.description ?? "",
        genre: body.genre ?? "Outro",
        wordCountGoal: Number(body.wordCountGoal ?? 50000),
        currentWordCount: 0,
        status: "ONGOING",
      };

      state.projects = [created, ...state.projects];
      state.statsByProjectId[created.id] = {
        totalWords: 0,
        averagePerDay: 0,
        activeDays: 0,
        bestDay: null,
      };
      state.historyByProjectId[created.id] = [];

      return fulfillJson(created, 201);
    }

    if (pathname === "/api/projects/monthly" && method === "GET") {
      return fulfillJson({ total: 1200, month: "2026-02" });
    }

    if (pathname === "/api/events/my" && method === "GET") {
      return fulfillJson(state.myEvents);
    }

    if (pathname === "/api/events/active" && method === "GET") {
      return fulfillJson(state.activeEvents);
    }

    const recentBadgesMatch = pathname.match(/^\/api\/badges\/projectId\/([^/]+)$/);
    if (recentBadgesMatch && method === "GET") {
      return fulfillJson([]);
    }

    const statsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/stats$/);
    if (statsMatch && method === "GET") {
      const projectId = statsMatch[1];
      return fulfillJson(
        state.statsByProjectId[projectId] ?? {
          totalWords: 0,
          averagePerDay: 0,
          activeDays: 0,
          bestDay: null,
        }
      );
    }

    const historyMatch = pathname.match(/^\/api\/projects\/([^/]+)\/history$/);
    if (historyMatch && method === "GET") {
      const projectId = historyMatch[1];
      return fulfillJson(state.historyByProjectId[projectId] ?? []);
    }

    const progressMatch = pathname.match(/^\/api\/projects\/([^/]+)\/progress$/);
    if (progressMatch && method === "POST") {
      const projectId = progressMatch[1];
      const body = request.postDataJSON();
      state.progressPosts.push({ projectId, body });

      return fulfillJson({ message: "Progress added successfully." });
    }

    return fulfillJson(
      {
        message: `Unhandled mock: ${method} ${pathname}`,
      },
      404
    );
  });
}

test("login flow persists across reload", async ({ page }) => {
  const state = createMockState();
  await installApiMocks(page, state);

  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();

  await page.locator('input[type="email"]').fill("writer@planwriter.test");
  await page.locator('input[type="password"]').fill("Segura123!");
  await page.getByRole("button", { name: /^Entrar$/ }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Bem vindo de volta, Escritor.")).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Seus projetos")).toBeVisible();
});

test("dashboard can create a new project through the modal", async ({ page }) => {
  const state = createMockState();
  await installApiMocks(page, state);
  await seedAuthenticatedSession(page, state);

  await page.goto("/dashboard");
  await expect(page.getByText("Bem vindo de volta, Escritor.")).toBeVisible();

  await page.getByRole("button", { name: /Novo projeto/i }).click();
  await expect(page.getByRole("heading", { name: "Novo Projeto" })).toBeVisible();

  await page.locator('input[name="title"]').fill("Projeto QA");
  await page.locator('select[name="genre"]').selectOption("Ficção Científica");
  await page.locator('textarea[name="description"]').fill("Projeto criado pelo smoke test.");
  await page.getByRole("button", { name: /^Criar projeto$/ }).click();

  await expect(page.getByText("Projeto criado com sucesso")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText("Projeto QA")).toBeVisible();
});

test("editor saves progress and exports txt, docx and pdf", async ({ page }) => {
  const state = createMockState();
  await installApiMocks(page, state);
  await seedAuthenticatedSession(page, state);

  await page.goto("/editor");
  await expect(page.getByText("Editor de texto")).toBeVisible();
  await expect(page.locator('[contenteditable="true"]')).toBeVisible();

  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type("Texto com acentuação: ação, coração e edição.");

  await expect(page.getByText("Palavras no texto")).toBeVisible();
  await expect(page.getByRole("button", { name: /Salvar no projeto/ })).toBeEnabled();

  await page.getByRole("button", { name: /Salvar no projeto/ }).click();
  await expect(
    page.getByText("Progresso salvo no projeto")
  ).toBeVisible();
  await expect.poll(() => state.progressPosts.length).toBe(1);
  await expect(state.progressPosts[0].body.wordsWritten).toBeGreaterThan(0);
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText("Progresso salvo no projeto")).not.toBeVisible();

  await page.getByRole("combobox", { name: "Formato de exportação" }).selectOption("txt");
  const txtDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar" }).click();
  await expect((await txtDownload).suggestedFilename()).toMatch(/\.txt$/);

  await page.getByRole("combobox", { name: "Formato de exportação" }).selectOption("doc");
  const docxDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar" }).click();
  await expect((await docxDownload).suggestedFilename()).toMatch(/\.docx$/);

  await page.getByRole("combobox", { name: "Formato de exportação" }).selectOption("pdf");
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar" }).click();
  await expect((await pdfDownload).suggestedFilename()).toMatch(/\.pdf$/);
});

test("legacy sprint route redirects to editor sprint mode", async ({ page }) => {
  const state = createMockState();
  await installApiMocks(page, state);
  await seedAuthenticatedSession(page, state);

  await page.goto("/sprint");

  await expect(page).toHaveURL(/\/editor\?mode=sprint$/);
  await expect(page.getByText("Editor de texto")).toBeVisible();
  await expect(page.getByRole("button", { name: "Modo sprint" })).toHaveClass(/bg-\[#2f5d73\]/);
  await expect(page.getByRole("link", { name: "Sprint" })).toHaveCount(0);
});
