export const HEADER_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
] as const;

/** Footer navigation, shown as two columns: services first, then company pages. */
export const FOOTER_NAV_COLUMNS = [
  [
    { label: 'Home', to: '/' },
    { label: 'ECU Services', to: '/ecu-services' },
    { label: 'TCU Services', to: '/tcu-services' },
    { label: 'Stage 1', to: '/ecu-services#stage-1' },
  ],
  [
    { label: 'How It Works', to: '/how-it-works' },
    { label: 'B2B Partnerships', to: '/b2b-partnerships' },
    { label: 'About', to: '/about' },
    { label: 'FAQ', to: '/#faq' },
  ],
] as const;

export const FOOTER_LEGAL_LINKS = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Cookie Policy', to: '/cookie-policy' },
] as const;
