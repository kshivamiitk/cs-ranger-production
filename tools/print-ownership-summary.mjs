const ownership = [
  ['frontend/app', 'Next.js route surfaces and API route adapters'],
  ['frontend/components', 'Reusable presentation components'],
  ['backend/Learner and Creator Product', 'Course catalog, learner access, creator workflows'],
  ['backend/Learning Engine', 'Node runtimes, attempts, certificates'],
  ['backend/Payments, Admin & Trust', 'Payments, admin, support, trust operations'],
  ['backend/Data, Growth & Experience', 'Search, feed, achievements, analytics surfaces'],
  ['database/supabase/migrations', 'Database schema, policies, indexes, read models'],
  ['shared', 'Shared config and contracts'],
];

for (const [area, responsibility] of ownership) {
  console.log(`${area}: ${responsibility}`);
}
