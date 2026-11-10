# Valitudo AI — React UI/UX v3

This revision focuses on the requested UI/UX refinements:

- Reduced the white gutter between the fixed sidebar and main content.
- Replaced article placeholder color blocks with real human/food photography loaded from Unsplash image URLs.
- Added full article detail pages with real article content.
- Clicking any article card opens its article page.
- Added a smooth login/register → home transition with welcome animation.
- Added route transition animation for page changes.
- Added scroll-reveal animations using IntersectionObserver.
- Preserved the Valitudo sidebar, banner, cards, and overall visual language from the supplied design.

## Run

```bash
npm install
npm run dev
```

The article photographs use remote Unsplash image URLs, so an internet connection is required for those images to load.

Authentication remains a frontend demo using localStorage/sessionStorage; it can later be connected to a real backend or Firebase/Supabase.
