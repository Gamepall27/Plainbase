import { test, expect } from "@playwright/test";

test("critical app shell flows render successfully", async ({ page }) => {
  await page.goto("/");
  await page.request.post("/api/demo-user/sign-out");
  await page.reload();

  await expect(page.getByText("Plainbase")).toBeVisible();
  await expect(page.locator(".left-sidebar")).toContainText("Alle Dokumente");

  await page.getByRole("button", { name: "Anmelden oder Profilmenue oeffnen" }).click();
  await page.getByPlaceholder("E-Mail oder Benutzername").fill("editor");
  await page.getByPlaceholder("Passwort").fill("123");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();

  const profileButton = page.getByRole("button", { name: /oeffnet Kontomenue/i });
  await expect(profileButton).toBeVisible();
  await profileButton.click();

  await page.getByRole("menuitem", { name: "Einstellungen" }).click();
  await expect(page.getByText("Darstellungseinstellungen")).toBeVisible();

  const themeSelect = page.getByRole("combobox", { name: "Theme auswaehlen" });
  await expect(themeSelect).toHaveValue("system");
  await expect(themeSelect.locator("option")).toHaveText(["Light", "Dark", "System"]);

  await themeSelect.selectOption("dark");
  await expect(themeSelect).toHaveValue("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Schliessen", exact: true }).click();

  await page.locator(".document-tabs").getByRole("button", { name: "Neuen Tab anlegen" }).click();
  await expect(page.locator(".document-tab-title").filter({ hasText: "Neues Objekt" })).toBeVisible();
  await page.getByRole("button", { name: "Neues Objekt schliessen" }).click();
  await expect(page.getByRole("button", { name: "Neues Objekt schliessen" })).toHaveCount(0);

  await page.locator(".left-sidebar").getByRole("button", { name: "Neues Objekt anlegen" }).click();
  await page.getByRole("menuitem", { name: "Kanban Board" }).click();
  await expect(page.locator(".canvas-title-input")).toHaveValue(/kanban board/i);
  await expect(page.getByText("Das Board zeigt die aktuellen Workspace-Tickets gruppiert nach Status.")).toBeVisible();

  await page.locator(".left-sidebar").getByRole("button", { name: "Tickets" }).click();
  await expect(
    page.getByRole("heading", { name: "Tickets", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Alle aktuellen Dokumente mit verknuepften Tickets auf einen Blick.")
  ).toBeVisible();
});
