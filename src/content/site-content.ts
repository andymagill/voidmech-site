export const homeHero = {
  eyebrow: 'Build / test / deploy',
  headline: 'Tactical mech combat starts with better systems',
  body:
    'VoidMech is a physics-driven combat builder where every kilogram, weapon slot, and thrust decision changes how you survive in live missions. Build fast, fly precise, and adapt under pressure.',
  primaryCta: 'Download alpha',
  secondaryCta: 'Join Discord',
  tertiaryLinks: ['Newsletter', 'Feedback', 'Bug report'],
}

export const mechanics = [
  {
    title: 'Modular loadout engineering',
    kicker: 'Systems',
    body:
      'Swap weapon arrays, armor stacks, and thrust packages to fit each mission profile without losing the tactical read on your build.',
  },
  {
    title: 'Vector control and station flight',
    kicker: 'Movement',
    body:
      'Use inertia, thrust routing, and spatial positioning to hold lanes through debris fields, station geometry, and hostile approach corridors.',
  },
  {
    title: 'Threat reading and target pressure',
    kicker: 'Combat',
    body:
      'Track lock chains, pressure windows, and enemy intent so you can break aggression at the right moment and survive the follow-up.',
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
      'Steam-facing assets are in progress. Initial public testing is being run through itch.io while the page and release pipeline are finalized.',
  },
  {
    question: 'What kind of game is VoidMech?',
    answer:
      'VoidMech is a tactical mech-builder with physics-based flight, modular loadouts, station-adjacent combat, and progression through combat and mining loops.',
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
    'A transparent view of what has shipped, what is in active production, and what is queued for upcoming mission cycles.',
}

export const roadmapMilestones = [
  {
    status: 'Completed',
    items: [
      'Core combat loop prototype with weapon, armor, and thrust tuning.',
      'Station-based movement and maneuvers built around spatial pressure.',
      'Targeting and threat telemetry readable enough for alpha pilots.',
    ],
  },
  {
    status: 'In progress',
    items: [
      'Mission variety and encounter pacing tuned for repeated runs.',
      'Enemy behavior and engagement pressure balancing for clearer fights.',
      'Loadout iteration improvements to speed up build experimentation.',
    ],
  },
  {
    status: 'Next up',
    items: [
      'Mining and upgrade progression loop tied to pilot performance.',
      'More objective variety and multi-stage station encounters.',
      'Expanded boss patterns and deeper tactical response windows.',
    ],
  },
]

export const roadmapCommunityVotes = [
  {
    kicker: 'Feature 1',
    title: 'Loadout presets and faster swap workflows',
    body:
      'More flexible module slots, quick-save presets, and a clearer weapon tuning loop.',
    tint: 'orange',
  },
  {
    kicker: 'Feature 2',
    title: 'Mission replay and tactical telemetry review',
    body:
      'Review movement, enemy pressure, and pilot decisions after a deployment ends.',
    tint: 'cyan',
  },
  {
    kicker: 'Feature 3',
    title: 'More station encounter patterns and objective variety',
    body:
      'Continue expanding the tactical density, pacing, and progression shape around live missions.',
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
  headline: 'Systems-first tactical mech combat',
  body:
    'VoidMech is a combat-builder focused on legible decisions under pressure. Build modular frames, pilot high-speed engagements, and iterate with data you can actually read in motion.',
}

export const aboutPrinciples = [
  {
    kicker: 'Legibility first',
    title: 'Legibility first',
    body:
      'Information should be fast to scan in active combat. Every panel, readout, and warning is designed to support immediate decision-making.',
  },
  {
    kicker: 'Precision over spectacle',
    title: 'Precision over spectacle',
    body:
      'Visual style supports function. Effects and animation communicate tactical state instead of obscuring it.',
  },
  {
    kicker: 'Tactical, direct voice',
    title: 'Tactical, direct voice',
    body:
      'Copy and interface language stay concise, technical, and mission-focused.',
  },
]

export const aboutHighlights = [
  'Physics-aware movement that rewards controlled vector decisions.',
  'Combat spaces built around station geometry and spatial pressure.',
  'Mining loops that feed practical progression, not filler.',
  'Editor and loadout workflows designed for rapid iteration.',
]

export const aboutBoilerplate =
  'VoidMech is developed as a live-evolving project with community-informed priorities. The goal is a tight loop between design intent, pilot experience, and measurable gameplay improvements.'

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
  utilityLinks: ['Patch notes', 'Report bug', 'Newsletter'],
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
  'Improved station maneuver readability and camera stability.',
  'Updated combat feedback for projectile impact timing.',
  'Refined mining feedback loop and cargo signaling.',
  'Editor updates for faster build-compare iteration.',
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
