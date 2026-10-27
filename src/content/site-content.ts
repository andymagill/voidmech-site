type SiteImage = {
  src: string
  alt: string
  caption: string
}

const stationEclipseSrc = new URL(
  '../../content/marketing-assets/vm_fight_16.png',
  import.meta.url,
).href
const stationApproachSrc = new URL(
  '../../content/marketing-assets/vm_ui_station_tweaks_01.png',
  import.meta.url,
).href
const stationIdleSrc = new URL(
  '../../content/marketing-assets/vm_ui_catalog_01.png',
  import.meta.url,
).href
const stationNearmissSrc = new URL(
  '../../content/marketing-assets/vm_station_nearmiss_01.png',
  import.meta.url,
).href
const stationSunSrc = new URL(
  '../../content/marketing-assets/vm_fight_06.png',
  import.meta.url,
).href
const stationTrafficSrc = new URL(
  '../../content/marketing-assets/vm_station_traffic_01.png',
  import.meta.url,
).href
const combatBurstSrc = new URL(
  '../../content/marketing-assets/vm_fight_04.png',
  import.meta.url,
).href
const combatLaserSrc = new URL(
  '../../content/marketing-assets/vm_fight_03.png',
  import.meta.url,
).href
const miningBeltSrc = new URL(
  '../../content/marketing-assets/vm_mining_belt_01.png',
  import.meta.url,
).href
const miningSweepSrc = new URL(
  '../../content/marketing-assets/vm_mining_sweep_01.png',
  import.meta.url,
).href
const editorScoutSrc = new URL(
  '../../content/marketing-assets/vm_editor_scout_01.png',
  import.meta.url,
).href
const titleMenuSrc = new URL(
  '../../content/marketing-assets/vm_title_menu_01.png',
  import.meta.url,
).href
const titlePlateFar2Src = new URL(
  '../../content/marketing-assets/vm_ui_sweep_01.png',
  import.meta.url,
).href
const titlePlateRingSrc = new URL(
  '../../content/marketing-assets/vm_ui_controls_01.png',
  import.meta.url,
).href

const gameplayPlanetSrc = new URL(
  '../../content/marketing-assets/voidmech_gameplay_fight_09_1920x1080.png',
  import.meta.url,
).href
const gameplayAsteroidsSrc = new URL(
  '../../content/marketing-assets/voidmech_gameplay_fight_08_1920x1080.png',
  import.meta.url,
).href
const gameplayBeamsSrc = new URL(
  '../../content/marketing-assets/voidmech_gameplay_fight_11_1920x1080.png',
  import.meta.url,
).href
const gameplayCannonSrc = new URL(
  '../../content/marketing-assets/voidmech_gameplay_fight_16_1920x1080.png',
  import.meta.url,
).href

export const siteImages = {
  stationEclipse: {
    src: stationEclipseSrc,
    alt: 'VoidMech combat frame with multiple ships and debris pressure in view.',
    caption: 'Cruiser under thrust near an asteroid cluster',
  },
  stationApproach: {
    src: stationApproachSrc,
    alt: 'Station-focused gameplay frame showing tuning and tactical space layout.',
    caption: 'Station builder',
  },
  stationIdle: {
    src: stationIdleSrc,
    alt: 'Gameplay catalog-style frame showing encounter composition and readability.',
    caption: 'Ship catalog',
  },
  stationNearmiss: {
    src: stationNearmissSrc,
    alt: 'Close near-miss pass by station structure during active maneuvering.',
    caption: 'Target lock on a nearby ship',
  },
  stationSun: {
    src: stationSunSrc,
    alt: 'High-action fight capture with weapon trails and target pressure.',
    caption: 'Firefight in an asteroid field',
  },
  stationTraffic: {
    src: stationTrafficSrc,
    alt: 'Dense station-adjacent traffic with multiple ships in view.',
    caption: 'Asteroid cluster over a gas giant',
  },
  combatBurst: {
    src: combatBurstSrc,
    alt: 'Burst combat exchange with concentrated fire and evasive movement.',
    caption: 'Shields flaring under fire',
  },
  combatLaser: {
    src: combatLaserSrc,
    alt: 'Laser-forward combat frame with visible projectile pressure lines.',
    caption: 'Ship caught in crossing beams',
  },
  miningBelt: {
    src: miningBeltSrc,
    alt: 'Mining belt environment with extraction routes and asteroid density visible.',
    caption: 'Ship at the edge of an asteroid belt',
  },
  miningSweep: {
    src: miningSweepSrc,
    alt: 'Mining sweep pass showing extraction flow and tactical spacing.',
    caption: 'Mining beams on an asteroid',
  },
  editorScout: {
    src: editorScoutSrc,
    alt: 'Ship builder editor view with scout layout and module composition visible.',
    caption: 'Scout in the ship builder',
  },
  titleMenu: {
    src: titleMenuSrc,
    alt: 'VoidMech title menu scene showing atmospheric lighting and silhouette composition.',
    caption: 'Title screen',
  },
  titlePlateFar2: {
    src: titlePlateFar2Src,
    alt: 'Wide scenic gameplay plate used for atmospheric title and context visuals.',
    caption: 'Mining beam close-up',
  },
  titlePlateRing: {
    src: titlePlateRingSrc,
    alt: 'Control-focused capture showing HUD and pilot input context.',
    caption: 'Controls reference',
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
    caption: 'Fighter under beam fire near a star',
  },
  gameplayCannon: {
    src: gameplayCannonSrc,
    alt: 'Red and white fighter firing a cannon while enemy beams cross an asteroid field.',
    caption: 'Fighter firing a cannon in an asteroid field',
  },
} satisfies Record<string, SiteImage>

export const homeHeroImage = siteImages.stationEclipse

export const homeSystemGallery = [
  siteImages.combatLaser,
  siteImages.miningSweep,
  siteImages.gameplayPlanet,
]

export const aboutImages = {
  primary: siteImages.editorScout,
  secondary: siteImages.combatBurst,
}

export const roadmapImages = [
  siteImages.gameplayAsteroids,
  siteImages.gameplayBeams,
  siteImages.gameplayCannon,
]

export const downloadHeroImage = siteImages.titleMenu

export const downloadGallery = [
  siteImages.miningBelt,
  siteImages.stationNearmiss,
  siteImages.stationSun,
]

export const homeHero = {
  eyebrow: 'Build / fly / rebuild',
  headline: 'Build-to-fly combat where every block matters',
  body:
    'VoidMech is a ship-building combat sandbox where your block layout directly controls mass, thrust, balance, power load, and handling. Mine ore, dock to unload, and rebuild fast around what you just learned in live fights.',
  primaryCta: 'Download alpha',
  secondaryCta: 'Join Discord',
  tertiaryLinks: [
    { label: 'Newsletter', href: '#newsletter' },
    { label: 'Feedback', href: '#feedback' },
    { label: 'Bug report', href: '#bug-report' },
  ],
}

export const mechanics = [
  {
    title: 'Build-to-fly ship design',
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

export const faq = [
  {
    question: 'Where can I download the alpha?',
    answer:
      'The current alpha is distributed via the official VoidMech itch.io page. The download page also includes install and support steps.',
  },
  {
    question: 'Is VoidMech available on Steam?',
    answer:
      'Not yet. Current public alpha distribution is through itch.io, and storefront expansion updates will be posted on the roadmap.',
  },
  {
    question: 'What kind of game is VoidMech?',
    answer:
      'VoidMech is a build-to-fly ship combat game with physics-based handling, destructible block systems, and a gather-design-fight progression loop.',
  },
  {
    question: 'Can I submit feedback or bug reports?',
    answer:
      'Yes. Use the site submission forms to send feedback, reproduction steps, platform details, and mission context.',
  },
  {
    question: 'Will my feedback affect the roadmap?',
    answer:
      'Yes. Player reports and votes inform triage priorities, quality-of-life updates, and feature sequencing.',
  },
  {
    question: 'Do I need a high-end PC?',
    answer:
      'The alpha targets mainstream Windows hardware. Exact requirements and optimization notes are published on the download page as builds evolve.',
  },
]

export const roadmapHero = {
  eyebrow: 'Development track',
  headline: 'VoidMech roadmap',
  body:
    'A focused view of what is already delivered and which high-value systems are next for the public alpha path.',
}

export const roadmapMilestones = [
  {
    status: 'Completed updates',
    items: [
      'Advanced builder overhaul: selection tools, copy/cut/paste, mirror planes, and major build UX upgrades.',
      'Full combat systems: railgun and cloak mechanics, stronger hostile targeting flow, respawn/repair loop, and clearer combat HUD feedback.',
      'World and NPC ecosystem: large asteroid-belt arena, patrol/attacker/miner behaviors, docking and repair behaviors, and stronger world persistence.',
      'Polish and presentation: UI motion, sound design, reticle visibility, control quality improvements, and title/menu presentation upgrades.',
      'Exportable alpha build foundation: release pipeline groundwork, externalized data, versioning, player-file handling, and integrated feedback links.',
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

export const roadmapCommunityVotes = [
  {
    kicker: 'Feature 1',
    title: 'Station economy layer',
    body:
      'Add recipe costs, meaningful resource spending, and tighter economic decision pressure around mining returns.',
    tint: 'orange',
  },
  {
    kicker: 'Feature 2',
    title: 'Ship fabrication and fleet ownership',
    body:
      'Own multiple ships, transfer between frames, and expand progression from one craft into fleet-level play.',
    tint: 'cyan',
  },
  {
    kicker: 'Feature 3',
    title: 'Dock-in-place editing',
    body:
      'Open build mode around your current in-world ship, edit on-site, then return to action without full reset.',
    tint: 'green',
  },
]

export const roadmapFaq = [
  {
    question: 'How often is the roadmap updated?',
    answer:
      'Major updates are posted with each meaningful build cycle, with quick status notes shared between drops.',
  },
  {
    question: 'Does feedback really change priority?',
    answer:
      'Yes. Player reports and request clusters directly influence sequencing, especially for usability and combat readability work.',
  },
]

export const aboutHero = {
  eyebrow: 'Game profile',
  headline: 'Ship systems first, consequences always on',
  body:
    'VoidMech is built around one rule: your design choices must show up in flight and combat instantly. Build a ship, push it into danger, then rebuild around what failed and what worked.',
}

export const aboutPrinciples = [
  {
    kicker: 'Build',
    title: 'Layout is flight behavior',
    body:
      'Ship construction is not cosmetic. Block placement defines handling, balance, and survivability, so design decisions are always gameplay decisions.',
  },
  {
    kicker: 'Fight',
    title: 'Combat changes your ship in real time',
    body:
      'Recoil, shield pressure, and destroyed blocks immediately affect movement and power stability, forcing adaptation during active engagements.',
  },
  {
    kicker: 'Loop',
    title: 'Short tactical iteration loop',
    body:
      'Mining, docking, unloading, and rebuilding are paced for quick learning cycles so each run creates better designs and better decisions.',
  },
]

export const aboutHighlights = [
  'Advanced builder overhaul with selection tools, copy/cut/paste, mirror planes, and faster ship iteration.',
  'Railgun, cloak, targeting flow, respawn/repair loop, and clearer combat HUD feedback already integrated.',
  'Large asteroid-belt arena with patrol, attacker, and miner NPC behaviors plus docking/repair activity.',
  'Polish upgrades across UI motion, sound design, control quality, reticle visibility, and menu presentation.',
  'Export-ready alpha pipeline foundations including versioning, data externalization, and player file handling.',
]

export const aboutBoilerplate =
  'VoidMech is developed as a live-evolving public alpha where player feedback shapes sequencing. The roadmap is anchored to high-impact systems that deepen the build-fly-fight-rebuild loop.'

export const aboutCtas = [
  'Download alpha',
  'View roadmap',
  'Join Discord',
]

export const downloadHero = {
  eyebrow: 'Alpha access',
  headline: 'Download the latest VoidMech alpha',
  body:
    'Get the newest playable build, install it in minutes, and stay synced with patch notes, known issues, and support channels.',
  primaryCta: 'Download on itch.io',
  secondaryCta: 'Join Discord',
  utilityLinks: [
    { label: 'Patch notes', href: '#support' },
    { label: 'Report bug', href: '#bug-report' },
    { label: 'Newsletter', href: '#newsletter' },
  ],
}

export const downloadSteps = [
  'Download the latest alpha package from the official itch.io page.',
  'Extract into a clean folder, then launch the executable from that directory.',
  'Review controls, known issues, and recommended graphics settings before your first mission.',
  'If you hit blockers, submit a bug report with mission context and reproduction details.',
]

export const buildDetails = [
  { label: 'Current build', value: 'Alpha [version placeholder]' },
  { label: 'Updated', value: '[date placeholder]' },
  { label: 'Platform', value: 'Windows (initial)' },
  { label: 'Distribution', value: 'itch.io' },
]

export const patchHighlights = [
  'Advanced builder overhaul with selection tools, copy/cut/paste, and mirror planes.',
  'Combat systems expanded with railgun, cloak, stronger hostile targeting, and clearer HUD feedback.',
  'World ecosystem upgrades across asteroid-belt scale, NPC roles, and docking/repair behavior.',
  'Alpha export foundation strengthened with release pipeline, externalized data, and versioning support.',
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

export const ctaOptions = {
  primary: ['Download alpha build', 'Get latest build', 'Launch the alpha'],
  secondary: ['Read roadmap', 'Join pilot Discord', 'Send mission feedback'],
}

export const uiMicrocopy = {
  statusPill: 'Alpha active',
  announcementBadge: 'New build available',
  roadmapTeaser: 'See what ships next',
  supportLink: 'Open pilot support',
}

