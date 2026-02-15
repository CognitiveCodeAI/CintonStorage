import { expect, test, type Page } from '@playwright/test';

const mockCases = [
  {
    id: 'case-1',
    caseNumber: '26-00001',
    status: 'STORED',
    year: 2021,
    make: 'Honda',
    model: 'Accord',
    color: 'Blue',
    plateNumber: 'ABC1234',
    plateState: 'MI',
    towDate: '2026-02-10T12:00:00.000Z',
    policeHold: false,
    balance: 275,
  },
  {
    id: 'case-2',
    caseNumber: '26-00002',
    status: 'HOLD',
    year: 2018,
    make: 'Toyota',
    model: 'Corolla',
    color: 'Gray',
    plateNumber: 'XYZ9876',
    plateState: 'MI',
    towDate: '2026-02-05T12:00:00.000Z',
    policeHold: true,
    balance: 640,
  },
  {
    id: 'case-3',
    caseNumber: '26-00003',
    status: 'RELEASE_ELIGIBLE',
    year: 2019,
    make: 'Ford',
    model: 'Fusion',
    color: 'White',
    plateNumber: 'DEF5678',
    plateState: 'MI',
    towDate: '2026-02-01T12:00:00.000Z',
    policeHold: false,
    balance: 0,
  },
];

function trpcResult(json: unknown) {
  return { result: { data: json } };
}

async function mockTrpcApi(page: Page) {
  await page.route('**/api/trpc/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const procedures =
      requestUrl.pathname
        .split('/api/trpc/')[1]
        ?.split(',')
        .map((value) => decodeURIComponent(value))
        .filter(Boolean) ?? [];

    const payload = procedures.map((procedure) => {
      switch (procedure) {
        case 'auth.me':
          return trpcResult({
            id: 'user-1',
            email: 'ops@cinton.com',
            name: 'Ops User',
            role: 'ADMIN',
            permissions: ['CASE_VIEW', 'CASE_UPDATE'],
          });
        case 'dashboard.stats':
          return trpcResult({
            totalStored: 24,
            readyToRelease: 3,
            onHold: 5,
            todayRevenue: 1125,
            pendingIntake: 2,
            auctionEligible: 1,
          });
        case 'vehicleCase.search':
          return trpcResult({
            cases: mockCases,
            total: mockCases.length,
            hasMore: false,
          });
        case 'agency.list':
          return trpcResult([
            { id: 'agency-1', name: 'Clinton Township Police Department' },
          ]);
        default:
          return trpcResult({});
      }
    });

    const isBatch = requestUrl.searchParams.get('batch') === '1' || payload.length > 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isBatch ? payload : payload[0]),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'smoke-test-token');
  });
  await mockTrpcApi(page);
});

test('dashboard renders with operational shell controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Search by VIN, plate, or case number' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Intake' })).toBeVisible();
});

test('cases list renders dense rows with semantic statuses', async ({ page }) => {
  await page.goto('/cases');

  await expect(page.getByRole('heading', { name: 'Vehicle Cases' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.locator('[data-status="HOLD"]').first()).toContainText('Hold');
  await expect(page.locator('tbody tr').first()).toHaveAttribute('tabindex', '0');
});

test('slash shortcut opens global search with focused input', async ({ page }) => {
  await page.goto('/cases');

  await page.getByRole('heading', { name: 'Vehicle Cases' }).click();
  await page.keyboard.press('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const searchInput = page.getByRole('combobox', { name: 'Search vehicles' });
  await expect(searchInput).toBeVisible();
  await expect(searchInput).toBeFocused();

  await searchInput.fill('26');
  await expect(page.getByText('26-00001')).toBeVisible();
});

test('intake page renders step 1 and primary action', async ({ page }) => {
  await page.goto('/intake/new');

  await expect(page.getByRole('heading', { name: 'New Tow Request' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});
