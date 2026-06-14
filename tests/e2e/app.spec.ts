import { test, expect } from "@playwright/test";

test("self-serve setup and critical app shell flows render successfully", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Plainbase")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plainbase einrichten" })).toBeVisible();
  await page.getByPlaceholder("Firmenname").fill("Northwind Labs");
  await page.getByPlaceholder("Workspace-Name").fill("Operations");
  await page.getByPlaceholder("Admin-Name").fill("Nora Admin");
  await page.getByPlaceholder("Admin-Benutzername").fill("nora");
  await page.getByPlaceholder("Admin-E-Mail").fill("nora@northwind.test");
  await page.locator('input[placeholder="Passwort"]').fill("northwind123");
  await page.getByPlaceholder("Passwort bestaetigen").fill("northwind123");
  await page.getByRole("button", { name: "Erstinstallation abschliessen" }).click();

  await expect(page.locator(".left-sidebar")).toContainText("Alle Dokumente");
  await expect(page.getByRole("heading", { name: "Livegang vorbereiten" })).toBeVisible();
  await page.getByRole("button", { name: "Team einladen" }).click();
  const inviteDialog = page.getByRole("dialog", { name: "Teammitglied einladen" });
  await expect(inviteDialog).toBeVisible();
  await inviteDialog.getByPlaceholder("Name", { exact: true }).fill("Nils Viewer");
  await inviteDialog.getByPlaceholder("Benutzername").fill("nils");
  await inviteDialog.getByPlaceholder("E-Mail").fill("nils@northwind.test");
  await inviteDialog.getByRole("button", { name: "Einladung erstellen" }).click();
  await expect(page.getByRole("heading", { name: "Livegang vorbereiten" })).toHaveCount(0);

  const profileButton = page.getByRole("button", { name: /Nora Admin oeffnet Kontomenue/i });
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
  await expect(page.getByRole("button", { name: "Neuer Tab schliessen" })).toBeVisible();
  await expect(page.locator(".document-shell-empty")).toBeVisible();
  await expect(page.locator(".document-toolbar")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Kein Objekt geoeffnet" })).toHaveCount(0);
  await page.getByRole("button", { name: "Neuer Tab schliessen" }).click();
  await expect(page.getByRole("button", { name: "Neuer Tab schliessen" })).toHaveCount(1);

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
