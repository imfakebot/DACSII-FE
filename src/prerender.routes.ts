export default async function getPrerenderRoutes(): Promise<string[]> {
  // Example static routes to prerender. Replace or extend with real IDs if you need prerendering.
  return [
    '/',
    '/feedbacks/1',
    '/feedbacks/2',
    '/admin/fields/1/edit',
    '/admin/feedback/1',
  ];
}
