import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';
import { properties } from '@/lib/properties';

const analyticsClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const allowedIds = new Set(properties.map(p => p.id));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get('days') || '30';
  const requestedId = searchParams.get('propertyId') || properties[0].id;
  const propertyId = allowedIds.has(requestedId) ? requestedId : properties[0].id;

  try {
    const n = parseInt(days);
    const dateRange = { startDate: `${days}daysAgo`, endDate: 'today' };
    const prevDateRange = { startDate: `${n * 2}daysAgo`, endDate: `${n + 1}daysAgo` };

    const [overviewRes, dailyRes, pagesRes, devicesRes, countriesRes] = await Promise.all([
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [dateRange, prevDateRange],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'newUsers' },
        ],
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 8,
      }),
    ]);

    const currentRow = overviewRes[0].rows?.find(r => r.dimensionValues?.[0]?.value === 'date_range_0');
    const prevRow = overviewRes[0].rows?.find(r => r.dimensionValues?.[0]?.value === 'date_range_1');

    const getVal = (row: typeof currentRow, idx: number) =>
      row?.metricValues?.[idx]?.value || '0';

    const overview = {
      activeUsers: getVal(currentRow, 0),
      sessions: getVal(currentRow, 1),
      pageViews: getVal(currentRow, 2),
      bounceRate: getVal(currentRow, 3),
      avgSessionDuration: getVal(currentRow, 4),
      newUsers: getVal(currentRow, 5),
      prev: {
        activeUsers: getVal(prevRow, 0),
        sessions: getVal(prevRow, 1),
        pageViews: getVal(prevRow, 2),
        bounceRate: getVal(prevRow, 3),
        avgSessionDuration: getVal(prevRow, 4),
        newUsers: getVal(prevRow, 5),
      },
    };

    const daily = dailyRes[0].rows?.map((row) => ({
      date: row.dimensionValues?.[0]?.value || '',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
    })) || [];

    const pages = pagesRes[0].rows?.map((row) => ({
      page: row.dimensionValues?.[0]?.value || '',
      views: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || [];

    const devices = devicesRes[0].rows?.map((row) => ({
      device: row.dimensionValues?.[0]?.value || '',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || [];

    const cities = countriesRes[0].rows?.map((row) => ({
      city: row.dimensionValues?.[0]?.value || '',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || [];

    return NextResponse.json({ overview, daily, pages, devices, cities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
