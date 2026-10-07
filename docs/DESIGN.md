> Historical Phase 1 notes. For the revised CMS/design and current results, see [README](../README.md) and [validation](VALIDATION.md).

# Original design system

Direction: **Next move.** An editorial creative studio, with oversized purposeful type, asymmetric work cards, quiet surfaces and a distinctive concentric orange/black motif. All artwork and layout were created for this project. The inspiration site was inaccessible; no claim is made that it was visually inspected.

Brand foundations: foreground/logo white `#FFFFFF`; orange gradient `#FF451D` at the top → `#FF5E00` at the bottom. Use dark text on orange buttons for readable contrast; white small text on these bright oranges does not meet normal-text AA contrast. Supporting palette: ink `#171714`, paper `#F4F2ED`, secondary surface `#E9E7DF`, body muted `#62625B`, divider `#D8D6CF`. Dark hero secondary text uses `#B6B6AD`.

Typography: Clash Display is the intended primary font. Current tested rendering uses Arial fallback because official font files cannot yet be downloaded. Secondary typography: Arial/system sans, minimal weight variation. No unlicensed third-party mirror or mislabeled substitute. Acquire font from the official vendor under its license and self-host WOFF2. Main headings use fluid sizing; body 16px, contextual text 12–14px, generous line spacing. Small labels are secondary and never replace critical instructions.

1280px content maximum; desktop gutters 48px, tablet 32px, phone 20px. Layouts collapse at 1100/800/520px; public forms and cards become single column on phones. Sections use 112/75px rhythm, component gaps around 18/24/32px, buttons minimum 52px tall. Test across 360, 390, 768, 1440 and 1920px rather than assuming responsive CSS is correct.

Components: semantic header/nav/footer, native mobile disclosure menu, primary/oriented text links, original project artwork, service rows, process list, package cards, native FAQ disclosure, labelled inquiry fields, explicit error/consent states. Icons are inline SVG with hidden decorative semantics and meaningful link labels. Social platform display comes from database records; icon variants will be selected through a validated CMS registry.

Motion: short hover changes only, no animation framework, scroll-jacking, cursor replacement or autoplay. Reduced-motion preference removes transitions/smooth scroll. Content remains visible without JavaScript. Focus states, a skip link, native keyboard semantics, visible labels and non-colour status copy are included. Browser interaction checks are implemented; automated checks do not establish full WCAG 2.2 AA conformance. Add keyboard/manual screen-reader and contrast review before launch and CMS release.
