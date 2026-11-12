/**
 * Static copy and media for every page. Pages import from here so wording and
 * screenshots can change without touching layout code. Screenshots are
 * imported from `content/marketing-assets/` so Vite fingerprints and bundles
 * only the files referenced below. Use static imports, not
 * `new URL(path, import.meta.url)`: Vite leaves that pattern untouched in the
 * Worker (SSR) bundle, where it throws at module load and 500s every request.
 */

import combatLaserSrc from '../../content/marketing-assets/vm_fight_03.png'
import miningSweepSrc from '../../content/marketing-assets/vm_mining_sweep_01.png'
import gameplayPlanetSrc from '../../content/marketing-assets/voidmech_gameplay_fight_09_1920x1080.png'
import gameplayAsteroidsSrc from '../../content/marketing-assets/voidmech_gameplay_fight_08_1920x1080.png'
import gameplayBeamsSrc from '../../content/marketing-assets/voidmech_gameplay_fight_11_1920x1080.png'
import gameplayCannonSrc from '../../content/marketing-assets/voidmech_gameplay_fight_16_1920x1080.png'
// Hero poster (bundled). The hero clips themselves are served from R2 via
// /media/:file, not bundled; see content/marketing-assets/web/README.md.
import combatPosterSrc from '../../content/marketing-assets/web/voidmech-combat-poster.jpg'

/** External destinations shared across the footer and CTAs. */
export const siteLinks = {
  itch: 'https://ndxmii.itch.io/voidmech',
} as const

/**
 * A link inside an FAQ answer: `href` for in-page modal hashes (`#feedback`),
 * `to` for client-side navigation to another route. `label` styles it as a
 * mono, uppercase lead-in instead of an inline text link.
 */
export type FaqLink = { text: string; label?: boolean } & (
  | { href: string }
  | { to: '/' | '/roadmap' }
)

/** An FAQ answer is a plain string, or paragraphs mixing text and links. */
export type FaqEntry = {
  question: string
  answer: string | ReadonlyArray<ReadonlyArray<string | FaqLink>>
}

/** A screenshot shown through `ScreenshotFigure`. */
export type SiteImage = {
  src: string
  alt: string
  caption: string
}

/** A silent gameplay clip shown through `HeroVideo`. */
export type SiteVideo = {
  src: string
  caption: string
}

/**
 * Hero media: a still `poster` (server-rendered, and all that reduced-motion
 * visitors see) and the `clips` one of which is picked at random per visit.
 */
export type SiteHeroVideo = {
  poster: SiteImage
  clips: ReadonlyArray<SiteVideo>
}

const siteImages = {
  combatLaser: {
    src: combatLaserSrc,
    alt: 'Laser-forward combat frame with visible projectile pressure lines.',
    caption: 'Ship caught in laser fire',
  },
  miningSweep: {
    src: miningSweepSrc,
    alt: 'Mining sweep pass showing extraction flow and tactical spacing.',
    caption: 'Mining beams on an asteroid',
  },
  gameplayPlanet: {
    src: gameplayPlanetSrc,
    alt: 'Player ship flying past a gas giant and asteroid field with the full flight HUD visible.',
    caption: 'Ship against a gas giant',
  },
  gameplayAsteroids: {
    src: gameplayAsteroidsSrc,
    alt: 'Ship thrusting through a dense ice and rock asteroid cluster beside a gas giant.',
    caption: 'Asteroid field beside a gas giant',
  },
  gameplayBeams: {
    src: gameplayBeamsSrc,
    alt: 'Player ship under fire from enemy beams in an asteroid field near a bright star.',
    caption: 'Fighter under laser fire',
  },
  gameplayCannon: {
    src: gameplayCannonSrc,
    alt: 'Red and white fighter firing a cannon while enemy beams cross an asteroid field.',
    caption: 'Fighter firing a cannon in an asteroid field',
  },
} satisfies Record<string, SiteImage>

export const homeHeroVideo: SiteHeroVideo = {
  poster: {
    src: combatPosterSrc,
    alt: 'Red and white fighter chasing an enemy ship past a large asteroid, with the flight HUD visible.',
    caption: 'Combat footage',
  },
  // R2 keys in the MEDIA bucket; the suffix is the file's sha256 prefix, so a
  // re-encode gets a new URL (responses are cached as immutable).
  clips: [
    { src: '/media/voidmech-combat-1-a92de0c1.mp4', caption: 'Fighter chasing a target' },
    { src: '/media/voidmech-combat-2-931d12ad.mp4', caption: 'Dogfight beside a gas giant' },
    { src: '/media/voidmech-combat-3-4ffd7e1d.mp4', caption: 'Ship thrusting through an asteroid field' },
  ],
}

export const homeSystemGallery = [
  siteImages.combatLaser,
  siteImages.miningSweep,
  siteImages.gameplayPlanet,
]

export const roadmapImages = [
  siteImages.gameplayAsteroids,
  siteImages.gameplayBeams,
  siteImages.gameplayCannon,
]

export const homeHero = {
  eyebrow: 'Build / fly / rebuild',
  headline: 'Build-to-fly combat where every block matters',
  body:
    'VoidMech is a ship-building space-combat sandbox where your block layout directly controls mass, thrust, balance, power load, and handling. Mine ore, dock to unload, and rebuild fast around what you just learned in live fights.',
  primaryCta: 'Download alpha',
  secondaryCta: 'Vote on the roadmap',
}

export const mechanics = [
  {
    title: 'Build, Fight, Explore',
    kicker: 'Design',
    body:
      'Every ship is assembled block by block, and that layout directly defines mass, thrust, balance, power load, and handling. Heavy, off-center designs fly exactly like they look.',
  },
  {
    title: 'Physics-driven space combat',
    kicker: 'Combat',
    body:
      'Weapons, recoil, shield drain, and block destruction feed back into flight performance in real time. Lose thrusters or generators mid-fight and your handling changes immediately.',
  },
  {
    title: 'Gather-Design-Fight',
    kicker: 'Loop',
    body:
      'Mine asteroids for ore, dock at stations to unload, redesign your ship around what you gathered, then take it back out to fight. The loop is short, tactical, and built around fast experimentation.',
  },
]

export const faq: ReadonlyArray<FaqEntry> = [
  {
    question: 'Where can I download the alpha?',
    answer: [
      [
        'The current alpha is distributed via the official VoidMech itch.io page. The latest build section on the ',
        { text: 'roadmap', to: '/roadmap' },
        ' lists the current version and its release notes; known issues and launch troubleshooting are above.',
      ],
    ],
  },
  {
    question: 'Is VoidMech available on Steam?',
    answer:
      'Not yet. Current public alpha distribution is through itch.io, and storefront expansion updates will be posted on the roadmap.',
  },
  {
    question: 'What kind of game is VoidMech?',
    answer:
      'VoidMech is a space ship building and combat simulation game with physics-based handling, destructible block systems, and a gather-design-fight progression loop.',
  },
  {
    question: 'Can I submit feedback or bug reports?',
    answer: [
      [
        { text: 'SIGNAL FEEDBACK', href: '#feedback', label: true },
        ': This is a good way to help shape the player experience. You can use it to share broad thoughts on the core loop, general ideas for expanding mechanics, granular gameplay impressions, and feature suggestions to improve ship building and combat.',
      ],
      [
        { text: 'BUG REPORT', href: '#bug-report', label: true },
        ': Dedicated to technical stability. When you encounter crashes, graphical glitches, or physics anomalies, providing clear reproduction steps helps address issues efficiently.',
      ],
    ],
  },
  {
    question: 'Will my feedback affect the roadmap?',
    answer: [
      [
        "Player ",
        { text: 'feedback', href: '#feedback' },
        ', ',
        { text: 'bug reports', href: '#bug-report' },
        ', and community votes on the ',
        { text: 'roadmap', to: '/roadmap' },
        " directly feed into implementation priorities, helping determine the sequencing and pacing new features.",
      ],
    ],
  },
  {
    question: 'Do I need a high-end PC?',
    answer:
      'The alpha targets mainstream Windows hardware with integrated graphics. Exact requirements and optimization notes are published on the itch.io page as builds evolve.',
  },
]

/** Roadmap section: the current build and the itch.io CTA, with the release log as its right column. */
export const latestBuild = {
  eyebrow: 'Alpha access',
  title: 'Latest build',
  primaryCta: 'Download on itch.io',
}

/**
 * Right column of the roadmap's latest build section: the newest release from
 * `content/releases` in full, then links to every earlier release's own page.
 */
export const releaseLog = {
  title: 'Release log',
  body: 'What changed in the current public alpha build. Every build has its own page.',
  empty: 'No release notes have been published yet. Check back after the next build.',
  earlierTitle: 'Earlier releases',
}

/** `/releases/<version>`: one release's notes on their own page. */
export const releasePage = {
  eyebrow: 'Release notes',
  /** Page title and `<title>`, e.g. "VoidMech 0.4.2-alpha". */
  title: (version: string) => `VoidMech ${version}`,
  description: (version: string, date: string) =>
    `What changed in VoidMech ${version}, the public alpha build released ${date}.`,
  backLink: 'Release log',
  latestBadge: 'Current build',
  newer: 'Newer',
  older: 'Older',
}

/** The roadmap has no visible hero; this is its screen-reader-only h1. */
export const roadmapPage = {
  title: 'VoidMech roadmap',
}

export const roadmapMilestones = [
  {
    status: 'Completed updates',
    items: [
      'Advanced builder overhaul: selection tools, copy/cut/paste, mirror planes, and major build UX upgrades.',
      'New combat systems: railgun and cloak mechanics, stronger hostile targeting flow, respawn/repair loop, and clearer combat HUD feedback.',
      'World and NPC ecosystem: large asteroid-belt arena, patrol/attacker/miner behaviors, docking and repair behaviors, and stronger world persistence.',
      'Polish and presentation: UI motion, sound design, reticle visibility, control quality improvements, and title/menu presentation upgrades.',
      'Exportable alpha build: release pipeline groundwork, externalized data, versioning, player-file handling, and integrated feedback links.',
    ],
  },
  {
    status: 'Backlog: systems',
    items: [
      'Station economy layer with recipe-based costs, resource spending, and meaningful ore sinks.',
      'Player-built station expansion to shape infrastructure and logistics flow.',
      'Ship fabrication plus fleet ownership to support multi-ship progression and transfer.',
    ],
  },
  {
    status: 'Backlog: world and fidelity',
    items: [
      'Dock-in-place editing so players can modify their live ship in-world and resume immediately.',
      'Expanded salvage and derelict interaction to make post-combat fields strategically valuable.',
      'Visual fidelity passes, including localized particle lighting and additional look-pass improvements.',
    ],
  },
]

/** Static rows; the roadmap's latest build section prepends the current build and date from the latest release. */
export const buildDetails = [
  { label: 'Platform', value: 'Windows (initial)' },
  { label: 'Distribution', value: 'itch.io' },
]

export const knownIssues = [
  'Some UI readouts may overlap at uncommon aspect ratios.',
  'Rare mission restarts can desync local audio layers.',
  'Certain high-speed turns may produce temporary camera jitter.',
]

export const troubleshootingSteps = [
  'Re-extract the package in a new folder.',
  'Run as standard user first (avoid restricted install paths).',
  'Confirm graphics drivers are up to date.',
  'Submit a bug report with logs and hardware info.',
]

export const supportPrompts = {
  bug: 'Found a mission-breaker? Send a report with location, expected behavior, and what happened instead.',
  feedback:
    'Tell us what felt sharp, unclear, or frustrating. Your notes directly influence patch priorities.',
  newsletter: 'Get build drops, roadmap updates, and focused playtest invites.',
}

/** "Keep the signal open" cards; each opens a submission modal through its URL hash (see SubmissionModals). */
export const supportCards = [
  { label: 'Bug report', tint: 'text-[var(--vm-orange)]', text: supportPrompts.bug, href: '#bug-report', cta: 'Report bug' },
  { label: 'Feedback', tint: 'text-[var(--vm-cyan)]', text: supportPrompts.feedback, href: '#feedback', cta: 'Send feedback' },
  { label: 'Newsletter', tint: 'text-[var(--vm-green)]', text: supportPrompts.newsletter, href: '#newsletter', cta: 'Join newsletter' },
]
