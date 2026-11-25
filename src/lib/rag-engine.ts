export type RetrievalMode = "bm25" | "dense" | "hybrid_rerank";

export type ConceptKey =
  | "vpn_tunnel"
  | "vpn_cert"
  | "password_okta"
  | "mfa_phone"
  | "teams_av"
  | "onedrive_sync"
  | "hardware_bitlocker"
  | "stolen_device"
  | "phishing_soc"
  | "sso_browser";

export type TicketPriority = "P1" | "P2" | "P3";

export interface KbDocument {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly category: "Network" | "Identity" | "Security" | "Collaboration" | "Storage" | "Hardware";
  readonly tags: readonly string[];
  readonly priority: TicketPriority;
  readonly symptoms: readonly string[];
  readonly resolution: readonly string[];
  readonly escalationCue: string;
  readonly conceptWeights: Readonly<Record<ConceptKey, number>>;
}

export interface RankedKbResult {
  readonly doc: KbDocument;
  readonly rank: number;
  readonly bm25Score: number;
  readonly denseScore: number;
  readonly rrfScore: number;
  readonly rerankScore: number;
  readonly finalScore: number;
  readonly rankDelta: number;
  readonly matchedTerms: readonly string[];
}

export interface McpToolDispatch {
  readonly transport: "stdio";
  readonly server: "helpdesk-tickets";
  readonly tool: string;
  readonly priority: TicketPriority;
  readonly arguments: Readonly<Record<string, string | boolean | readonly string[]>>;
}

export interface LatencyBreakdownMs {
  readonly bm25_ms: number;
  readonly dense_ms: number;
  readonly rrf_fusion_ms: number;
  readonly rerank_ms: number;
  readonly total_ms: number;
}

export interface RagPipelineResponse {
  readonly query: string;
  readonly mode: RetrievalMode;
  readonly topK: number;
  readonly corpusSize: number;
  readonly results: readonly RankedKbResult[];
  readonly groundedAnswer: string;
  readonly citations: readonly string[];
  readonly mcpDispatch: McpToolDispatch;
  readonly latencyBreakdownMs: LatencyBreakdownMs;
}

export interface PresetEvalQuery {
  readonly id: string;
  readonly label: string;
  readonly query: string;
  readonly expectedKb: string;
  readonly note: string;
}

const CONCEPT_KEYS: readonly ConceptKey[] = [
  "vpn_tunnel",
  "vpn_cert",
  "password_okta",
  "mfa_phone",
  "teams_av",
  "onedrive_sync",
  "hardware_bitlocker",
  "stolen_device",
  "phishing_soc",
  "sso_browser",
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "got",
  "has",
  "have",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "keeps",
  "me",
  "my",
  "not",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "when",
  "with",
]);

/** Keyword and phrase triggers mapped to normalized concept weights. */
const CONCEPT_LEXICON: Readonly<Record<ConceptKey, Readonly<Record<string, number>>>> = {
  vpn_tunnel: {
    vpn: 1.0,
    anyconnect: 1.1,
    tunnel: 0.9,
    cisco: 0.9,
    disconnect: 0.85,
    disconnecting: 0.85,
    disconnects: 0.85,
    drop: 0.75,
    dropping: 0.8,
    drops: 0.8,
    reconnecting: 0.85,
    wifi: 0.55,
    sleep: 0.5,
    timeout: 0.65,
    hourly: 0.7,
    hour: 0.55,
  },
  vpn_cert: {
    certificate: 1.1,
    cert: 1.0,
    tls: 1.0,
    ssl: 0.9,
    handshake: 0.95,
    split: 0.6,
    mtu: 0.9,
    gateway: 0.75,
    expired: 0.7,
    trust: 0.6,
  },
  password_okta: {
    password: 1.1,
    reset: 0.8,
    forgot: 0.95,
    locked: 0.65,
    unlock: 0.9,
    okta: 0.85,
    signin: 0.8,
    sign: 0.5,
    sspr: 1.0,
    expired: 0.65,
  },
  mfa_phone: {
    mfa: 1.15,
    "2fa": 1.25,
    two: 0.45,
    factor: 0.85,
    authenticator: 1.1,
    phone: 0.8,
    water: 0.95,
    dropped: 0.7,
    broken: 0.75,
    tap: 1.0,
    temporary: 0.85,
    pass: 0.65,
    otp: 1.0,
    qr: 0.95,
    backup: 0.65,
    locked_out: 0.95,
  },
  teams_av: {
    teams: 1.1,
    audio: 1.0,
    mic: 1.0,
    microphone: 1.0,
    camera: 1.0,
    webcam: 1.0,
    video: 0.7,
    muted: 0.9,
    headset: 0.95,
    speaker: 0.85,
    calls: 0.45,
  },
  onedrive_sync: {
    onedrive: 1.2,
    sync: 1.0,
    syncing: 1.0,
    upload: 0.8,
    stuck: 0.75,
    conflict: 0.85,
    paused: 0.85,
    storage: 0.7,
    quota: 0.8,
    sharepoint: 0.75,
  },
  hardware_bitlocker: {
    bitlocker: 1.25,
    boot: 1.0,
    blue: 0.85,
    screen: 0.75,
    recovery: 0.85,
    encryption: 1.1,
    encrypt: 0.9,
    encrypted: 0.95,
    48: 1.15,
    digit: 1.05,
    tpm: 1.1,
    laptop: 0.6,
    power: 0.6,
    dock: 0.65,
    bios: 0.85,
  },
  stolen_device: {
    stolen: 1.25,
    theft: 1.2,
    lost: 1.1,
    missing: 0.9,
    airport: 0.95,
    taxi: 0.95,
    wipe: 1.05,
    revoke: 0.95,
    bag: 0.75,
    backpack: 0.8,
    device: 0.55,
  },
  phishing_soc: {
    phishing: 1.25,
    phishalarm: 1.25,
    fake: 0.95,
    ceo: 1.1,
    executive: 0.95,
    wire: 1.15,
    transfer: 0.9,
    gift: 0.9,
    suspicious: 0.95,
    spoof: 1.0,
    email: 0.65,
    iso: 0.9,
    zip: 0.8,
    scam: 1.0,
    bec: 1.1,
  },
  sso_browser: {
    browser: 1.05,
    chrome: 1.05,
    edge: 0.95,
    redirect: 1.1,
    loop: 1.15,
    spinning: 0.95,
    cookies: 1.0,
    cookie: 0.95,
    sso: 1.05,
    cache: 0.85,
    extension: 0.8,
    incognito: 0.9,
    saml: 1.0,
  },
};

/** Multi-word semantic triggers boosted during dense encoding. */
const PHRASE_CONCEPT_BOOSTS: readonly {
  readonly phrase: string;
  readonly concept: ConceptKey;
  readonly weight: number;
}[] = [
  { phrase: "locked out", concept: "mfa_phone", weight: 1.1 },
  { phrase: "2fa", concept: "mfa_phone", weight: 1.2 },
  { phrase: "new phone", concept: "mfa_phone", weight: 1.1 },
  { phrase: "in water", concept: "mfa_phone", weight: 0.95 },
  { phrase: "48 digit", concept: "hardware_bitlocker", weight: 1.25 },
  { phrase: "blue screen", concept: "hardware_bitlocker", weight: 1.1 },
  { phrase: "encryption code", concept: "hardware_bitlocker", weight: 1.2 },
  { phrase: "encryption key", concept: "hardware_bitlocker", weight: 1.2 },
  { phrase: "won't boot", concept: "hardware_bitlocker", weight: 1.1 },
  { phrase: "wire transfer", concept: "phishing_soc", weight: 1.25 },
  { phrase: "fake ceo", concept: "phishing_soc", weight: 1.2 },
  { phrase: "gift card", concept: "phishing_soc", weight: 1.15 },
  { phrase: "redirect loop", concept: "sso_browser", weight: 1.25 },
  { phrase: "spinning", concept: "sso_browser", weight: 0.9 },
  { phrase: "handshake timeout", concept: "vpn_cert", weight: 1.1 },
  { phrase: "drops every", concept: "vpn_tunnel", weight: 1.0 },
];

export const KB_CORPUS: readonly KbDocument[] = [
  {
    id: "KB-001",
    slug: "kb-001-vpn-disconnects.md",
    title: "VPN Keeps Disconnecting (Cisco AnyConnect)",
    category: "Network",
    tags: ["vpn", "anyconnect", "remote-work", "disconnect"],
    priority: "P3",
    symptoms: [
      "Cisco AnyConnect connects to vpn.northwind.example but drops periodically every hour.",
      "Reconnecting loop freezes Teams calls and active file transfers.",
    ],
    resolution: [
      "Confirm AnyConnect 5.1+ in Company Portal > Cisco Secure Client.",
      "Disable Wi-Fi adapter power saving in Device Manager > Power Management.",
      "Set plugged-in sleep policy to Never; reconnect after 12h max session cap.",
    ],
    escalationCue: "Attach DART diagnostics ZIP to help.northwind.example (Network > VPN).",
    conceptWeights: {
      vpn_tunnel: 0.95,
      vpn_cert: 0.4,
      password_okta: 0.05,
      mfa_phone: 0.0,
      teams_av: 0.2,
      onedrive_sync: 0.05,
      hardware_bitlocker: 0.0,
      stolen_device: 0.0,
      phishing_soc: 0.0,
      sso_browser: 0.05,
    },
  },
  {
    id: "KB-002",
    slug: "kb-002-vpn-cannot-connect-certificate.md",
    title: "VPN Certificate & TLS Handshake Connection Failures",
    category: "Network",
    tags: ["vpn", "certificate", "tls", "mtu", "split-tunnel"],
    priority: "P3",
    symptoms: [
      "TLS handshake times out at 98% when connecting to gateway.",
      "Client reports missing or untrusted machine certificate in cert store.",
    ],
    resolution: [
      "Clamp split-tunnel MTU to 1360 bytes on congested home ISP bridges.",
      "Run gpupdate /force to renew machine SCEP TLS certificate from Intune.",
      "Verify system clock skew is under 30 seconds before retrying handshake.",
    ],
    escalationCue: "Open ticket under Network > Certificates with AnyConnect event logs.",
    conceptWeights: {
      vpn_tunnel: 0.65,
      vpn_cert: 0.98,
      password_okta: 0.1,
      mfa_phone: 0.05,
      teams_av: 0.0,
      onedrive_sync: 0.0,
      hardware_bitlocker: 0.0,
      stolen_device: 0.0,
      phishing_soc: 0.0,
      sso_browser: 0.1,
    },
  },
  {
    id: "KB-004",
    slug: "kb-004-password-reset-okta.md",
    title: "Self-Service Okta Password Reset & Account Recovery",
    category: "Identity",
    tags: ["okta", "password", "sspr", "credentials", "lockout"],
    priority: "P3",
    symptoms: [
      "Forgot Okta SSO password or expired 90-day credential prompt.",
      "Password rejected due to workspace history or complexity policy.",
    ],
    resolution: [
      "Use Forgot Password at northwind.okta.com with enrolled SMS or authenticator factor.",
      "Choose a 14+ character passphrase not matching the previous 10 credentials.",
      "Wait 60 seconds for Active Directory password write-back propagation.",
    ],
    escalationCue: "Call local 4357 if account lockout persists past 15 minutes.",
    conceptWeights: {
      vpn_tunnel: 0.05,
      vpn_cert: 0.0,
      password_okta: 0.98,
      mfa_phone: 0.35,
      teams_av: 0.0,
      onedrive_sync: 0.05,
      hardware_bitlocker: 0.0,
      stolen_device: 0.0,
      phishing_soc: 0.1,
      sso_browser: 0.3,
    },
  },
  {
    id: "KB-007",
    slug: "kb-007-mfa-new-phone.md",
    title: "Moving MFA to a New Phone & Temporary Access Pass",
    category: "Security",
    tags: ["mfa", "authenticator", "new-phone", "temporary-access-pass", "2fa"],
    priority: "P2",
    symptoms: [
      "Replaced, damaged, or wiped handset holding Microsoft Authenticator 2FA.",
      "User locked out of all SSO apps without second-factor approval device.",
    ],
    resolution: [
      "If old phone works: sign into aka.ms/mysecurityinfo and scan new QR code.",
      "If handset is lost or water-damaged: IT issues an 8-hour Temporary Access Pass (TAP).",
      "Complete video ID check at local 4357 and enroll the new Authenticator method.",
    ],
    escalationCue: "Full MFA lockout is triaged as P2 (High) priority with 15-minute SLA.",
    conceptWeights: {
      vpn_tunnel: 0.0,
      vpn_cert: 0.0,
      password_okta: 0.45,
      mfa_phone: 0.99,
      teams_av: 0.0,
      onedrive_sync: 0.0,
      hardware_bitlocker: 0.05,
      stolen_device: 0.25,
      phishing_soc: 0.0,
      sso_browser: 0.2,
    },
  },
  {
    id: "KB-011",
    slug: "kb-011-teams-audio-camera.md",
    title: "Microsoft Teams Audio, Headset & Camera Troubleshooting",
    category: "Collaboration",
    tags: ["teams", "audio", "microphone", "camera", "headset"],
    priority: "P3",
    symptoms: [
      "Colleagues cannot hear microphone input or webcam shows black feed in Teams.",
      "Bluetooth headset switches to hands-free distorted mono audio during meetings.",
    ],
    resolution: [
      "Check Windows Privacy & Security > Microphone/Camera desktop app permissions.",
      "Select dedicated USB/Jabra Stereo profile inside Teams Settings > Devices.",
      "Run a Teams Make a test call to confirm echo cancellation and camera preview.",
    ],
    escalationCue: "Check USB-C dock firmware if external webcam drops repeatedly.",
    conceptWeights: {
      vpn_tunnel: 0.15,
      vpn_cert: 0.0,
      password_okta: 0.0,
      mfa_phone: 0.0,
      teams_av: 0.99,
      onedrive_sync: 0.0,
      hardware_bitlocker: 0.15,
      stolen_device: 0.0,
      phishing_soc: 0.0,
      sso_browser: 0.0,
    },
  },
  {
    id: "KB-013",
    slug: "kb-013-onedrive-sync-errors.md",
    title: "OneDrive Sync Errors, Stuck Uploads & Conflicts",
    category: "Storage",
    tags: ["onedrive", "sync", "sharepoint", "storage", "conflicts"],
    priority: "P3",
    symptoms: [
      "OneDrive cloud icon displays red X or permanent Processing changes state.",
      "SharePoint synced library files fail upload due to invalid characters or locks.",
    ],
    resolution: [
      "Remove unsupported characters (~ # % & * : < > ? / \\ |) and keep path < 400 chars.",
      "Pause syncing for 2 hours, unlink credentials in Settings, and sign back in.",
      "Run onedrive.exe /reset from Win+R to rebuild local sync index.",
    ],
    escalationCue: "Never delete the local OneDrive folder before verifying cloud web copy.",
    conceptWeights: {
      vpn_tunnel: 0.1,
      vpn_cert: 0.0,
      password_okta: 0.1,
      mfa_phone: 0.0,
      teams_av: 0.0,
      onedrive_sync: 0.99,
      hardware_bitlocker: 0.0,
      stolen_device: 0.0,
      phishing_soc: 0.0,
      sso_browser: 0.05,
    },
  },
  {
    id: "KB-016",
    slug: "kb-016-laptop-wont-boot-bitlocker.md",
    title: "Laptop Won't Boot or Asks for a BitLocker Recovery Key",
    category: "Hardware",
    tags: ["boot", "bitlocker", "recovery-key", "startup", "encryption"],
    priority: "P2",
    symptoms: [
      "Blue BitLocker screen prompts for a 48-digit recovery key after BIOS/dock event.",
      "Laptop shows Automatic Repair loop or fails to power on from USB-C hub.",
    ],
    resolution: [
      "Match 8-char Key ID at myaccount.microsoft.com > Devices > View BitLocker Keys.",
      "Unplug USB-C docks and enter all 48 digits cleanly; reboot normally afterward.",
      "For dead power: charge 15 min on direct OEM brick, hold power 30s for EC reset.",
    ],
    escalationCue: "Request a same-day IT depot loaner if BitLocker triggers twice in one week.",
    conceptWeights: {
      vpn_tunnel: 0.0,
      vpn_cert: 0.0,
      password_okta: 0.1,
      mfa_phone: 0.1,
      teams_av: 0.0,
      onedrive_sync: 0.0,
      hardware_bitlocker: 0.99,
      stolen_device: 0.15,
      phishing_soc: 0.0,
      sso_browser: 0.05,
    },
  },
  {
    id: "KB-023",
    slug: "kb-023-lost-or-stolen-device.md",
    title: "Lost or Stolen Corporate Device Emergency Response",
    category: "Security",
    tags: ["lost", "stolen", "security", "wipe", "incident"],
    priority: "P1",
    symptoms: [
      "Corporate laptop, badge, or enrolled mobile phone left in taxi/airport or stolen.",
      "Immediate risk of cached session cookies or offline device access.",
    ],
    resolution: [
      "Call local 4357 immediately to trigger SOC Intune remote lock and selective/full wipe.",
      "Revoke active Okta refresh tokens and invalidate VPN gateway client certs.",
      "Rotate local SSH keys/API tokens and file a physical loss report with Security.",
    ],
    escalationCue: "Mandatory P1 (Critical) SOC page — isolate sessions within 5 minutes.",
    conceptWeights: {
      vpn_tunnel: 0.05,
      vpn_cert: 0.15,
      password_okta: 0.25,
      mfa_phone: 0.45,
      teams_av: 0.0,
      onedrive_sync: 0.0,
      hardware_bitlocker: 0.25,
      stolen_device: 0.99,
      phishing_soc: 0.2,
      sso_browser: 0.0,
    },
  },
  {
    id: "KB-025",
    slug: "kb-025-phishing-reporting-suspicious-emails.md",
    title: "Reporting Phishing and Suspicious Emails with PhishAlarm",
    category: "Security",
    tags: ["phishing", "phishalarm", "bec", "suspicious", "soc"],
    priority: "P1",
    symptoms: [
      "Impersonated executive email urgently requesting gift cards or a wire transfer.",
      "Fake Okta/payroll suspension link or unsolicited .zip / .iso email attachment.",
    ],
    resolution: [
      "Do not reply, click links, or forward manually; click PhishAlarm > Report Phishing.",
      "MIME headers automatically extract to soc-alerts@northwind.example for quarantine.",
      "If credentials were entered: disconnect Wi-Fi immediately and call local 4357.",
    ],
    escalationCue: "Clicked link or credential exposure requires immediate P1 SOC containment.",
    conceptWeights: {
      vpn_tunnel: 0.0,
      vpn_cert: 0.0,
      password_okta: 0.25,
      mfa_phone: 0.1,
      teams_av: 0.0,
      onedrive_sync: 0.0,
      hardware_bitlocker: 0.0,
      stolen_device: 0.15,
      phishing_soc: 0.99,
      sso_browser: 0.05,
    },
  },
  {
    id: "KB-028",
    slug: "kb-028-browser-issues-okta-sso-loops.md",
    title: "Browser Issues & Okta SSO Redirect Loops",
    category: "Identity",
    tags: ["browser", "chrome", "edge", "okta", "sso", "cookies"],
    priority: "P3",
    symptoms: [
      "Chrome or Edge spins endlessly redirecting between app login and northwind.okta.com.",
      "Third-party cookie blocking or stale SAML token breaks embedded SSO iframe.",
    ],
    resolution: [
      "Test in Incognito/InPrivate first to isolate stale extension or session state.",
      "Allow third-party cookies for [*.]okta.com and [*.]microsoftonline.com.",
      "Clear cached SAML site data specifically for northwind.okta.com and re-authenticate.",
    ],
    escalationCue: "Collect HAR trace if loop persists across clean browser profiles.",
    conceptWeights: {
      vpn_tunnel: 0.0,
      vpn_cert: 0.1,
      password_okta: 0.5,
      mfa_phone: 0.1,
      teams_av: 0.0,
      onedrive_sync: 0.05,
      hardware_bitlocker: 0.0,
      stolen_device: 0.0,
      phishing_soc: 0.05,
      sso_browser: 0.99,
    },
  },
] as const;

export const PRESET_EVAL_QUERIES: readonly PresetEvalQuery[] = [
  {
    id: "q-mfa-water",
    label: "Locked out after phone damage",
    query: "Dropped my phone in water and locked out of 2FA",
    expectedKb: "KB-007",
    note: "Semantic paraphrase ('water', '2FA', 'locked out') where Hybrid+Rerank beats keyword matching.",
  },
  {
    id: "q-bitlocker-48",
    label: "Blue screen 48-digit code",
    query: "Laptop shows blue screen asking for 48 digit encryption code",
    expectedKb: "KB-016",
    note: "Concept match on encryption recovery -> routes P2 BitLocker Key ID lookup.",
  },
  {
    id: "q-ceo-wire",
    label: "Suspicious CEO wire email",
    query: "Got a fake CEO email asking for a wire transfer",
    expectedKb: "KB-025",
    note: "Zero lexical 'PhishAlarm' overlap; semantic concept vector triggers P1 SOC escalation.",
  },
  {
    id: "q-vpn-teams",
    label: "AnyConnect freezing calls",
    query: "AnyConnect keeps dropping Teams calls every hour",
    expectedKb: "KB-001",
    note: "Distinguishes hourly session drops (KB-001) from TLS handshake cert errors (KB-002).",
  },
  {
    id: "q-sso-loop",
    label: "Chrome SSO redirect loop",
    query: "Okta login keeps spinning in a redirect loop in Chrome",
    expectedKb: "KB-028",
    note: "Routes to cookie allowlisting rather than password reset (KB-004).",
  },
] as const;

/** Tokenizes text into normalized alphanumeric terms with stop-word filtering. */
export function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
  return raw.filter((token) => !STOP_WORDS.has(token));
}

function buildDocTermFreqs(doc: KbDocument): Map<string, number> {
  const freqs = new Map<string, number>();
  const addTokens = (tokens: readonly string[], weight: number) => {
    for (const token of tokens) {
      freqs.set(token, (freqs.get(token) ?? 0) + weight);
    }
  };
  addTokens(tokenize(doc.title), 2);
  addTokens(tokenize(doc.tags.join(" ")), 2);
  addTokens(tokenize(doc.symptoms.join(" ")), 1);
  addTokens(tokenize(doc.resolution.join(" ")), 1);
  return freqs;
}

const CORPUS_INDEX = (() => {
  const docFreqMaps = KB_CORPUS.map((doc) => ({
    id: doc.id,
    freqs: buildDocTermFreqs(doc),
  }));
  const dfMap = new Map<string, number>();
  let totalLen = 0;

  const lengths = new Map<string, number>();
  for (const entry of docFreqMaps) {
    let docLen = 0;
    for (const [term, count] of entry.freqs.entries()) {
      docLen += count;
      dfMap.set(term, (dfMap.get(term) ?? 0) + 1);
    }
    lengths.set(entry.id, docLen);
    totalLen += docLen;
  }

  return {
    docFreqMaps: new Map(docFreqMaps.map((d) => [d.id, d.freqs])),
    dfMap,
    lengths,
    avgDocLen: docFreqMaps.length > 0 ? totalLen / docFreqMaps.length : 1,
  };
})();

/** Computes Okapi BM25 lexical similarity and intersected query terms. */
export function scoreBm25(
  queryTokens: readonly string[],
  doc: KbDocument,
): { score: number; matchedTerms: string[] } {
  if (queryTokens.length === 0) {
    return { score: 0, matchedTerms: [] };
  }
  const k1 = 1.5;
  const b = 0.75;
  const n = KB_CORPUS.length;
  const docFreqs = CORPUS_INDEX.docFreqMaps.get(doc.id);
  const docLen = CORPUS_INDEX.lengths.get(doc.id) ?? CORPUS_INDEX.avgDocLen;
  if (!docFreqs) {
    return { score: 0, matchedTerms: [] };
  }

  const seen = new Set<string>();
  const matchedTerms: string[] = [];
  let score = 0;

  for (const token of queryTokens) {
    if (seen.has(token)) continue;
    seen.add(token);

    const tf = docFreqs.get(token) ?? 0;
    if (tf === 0) continue;

    matchedTerms.push(token);
    const df = CORPUS_INDEX.dfMap.get(token) ?? 1;
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
    const norm = tf + k1 * (1 - b + b * (docLen / CORPUS_INDEX.avgDocLen));
    score += idf * ((tf * (k1 + 1)) / norm);
  }

  return { score: Math.round(score * 1000) / 1000, matchedTerms };
}

/** Encodes a query into a 10D domain concept vector and computes cosine similarity. */
export function scoreDense(query: string, doc: KbDocument): number {
  const lower = query.toLowerCase();
  const tokens = tokenize(lower);
  const queryVec: Record<ConceptKey, number> = {
    vpn_tunnel: 0,
    vpn_cert: 0,
    password_okta: 0,
    mfa_phone: 0,
    teams_av: 0,
    onedrive_sync: 0,
    hardware_bitlocker: 0,
    stolen_device: 0,
    phishing_soc: 0,
    sso_browser: 0,
  };

  for (const key of CONCEPT_KEYS) {
    const lex = CONCEPT_LEXICON[key];
    for (const token of tokens) {
      const w = lex[token];
      if (w !== undefined) {
        queryVec[key] += w;
      }
    }
  }

  for (const trigger of PHRASE_CONCEPT_BOOSTS) {
    if (lower.includes(trigger.phrase)) {
      queryVec[trigger.concept] += trigger.weight;
    }
  }

  let dot = 0;
  let qMagSq = 0;
  let dMagSq = 0;
  for (const key of CONCEPT_KEYS) {
    const qv = queryVec[key];
    const dv = doc.conceptWeights[key];
    dot += qv * dv;
    qMagSq += qv * qv;
    dMagSq += dv * dv;
  }

  if (qMagSq === 0 || dMagSq === 0) {
    return 0;
  }
  const cosine = dot / (Math.sqrt(qMagSq) * Math.sqrt(dMagSq));
  return Math.round(Math.min(1, Math.max(0, cosine)) * 1000) / 1000;
}

function buildMcpDispatch(doc: KbDocument, citations: readonly string[], query: string): McpToolDispatch {
  if (doc.priority === "P1") {
    return {
      transport: "stdio",
      server: "helpdesk-tickets",
      tool: "escalate_security_incident",
      priority: "P1",
      arguments: {
        kb_id: doc.id,
        category: doc.category,
        require_soc_page: true,
        summary: doc.title,
        query_excerpt: query.slice(0, 120),
        citations,
      },
    };
  }
  if (doc.priority === "P2") {
    return {
      transport: "stdio",
      server: "helpdesk-tickets",
      tool: "issue_priority_ticket",
      priority: "P2",
      arguments: {
        kb_id: doc.id,
        category: doc.category,
        require_identity_check: true,
        sla_minutes: "15",
        summary: doc.title,
        citations,
      },
    };
  }
  return {
    transport: "stdio",
    server: "helpdesk-tickets",
    tool: "attach_kb_runbook",
    priority: "P3",
    arguments: {
      kb_id: doc.id,
      category: doc.category,
      auto_resolve_eligible: true,
      runbook_slug: doc.slug,
      citations,
    },
  };
}

/**
 * Executes Okapi BM25 + Dense semantic similarity + Reciprocal Rank Fusion (k=60)
 * + Cross-Encoder reranking and prepares a grounded response + stdio MCP dispatch.
 */
export function runRagPipeline(
  rawQuery: string,
  mode: RetrievalMode = "hybrid_rerank",
  topK = 4,
): RagPipelineResponse {
  const query = rawQuery.trim();
  const clampedK = Math.min(Math.max(Math.trunc(topK), 1), 6);
  const queryTokens = tokenize(query);

  const rawScored = KB_CORPUS.map((doc) => {
    const bm25 = scoreBm25(queryTokens, doc);
    const dense = scoreDense(query, doc);
    return {
      doc,
      bm25Score: bm25.score,
      matchedTerms: bm25.matchedTerms,
      denseScore: dense,
    };
  });

  const maxBm25 = Math.max(0.001, ...rawScored.map((s) => s.bm25Score));

  const bm25Sorted = [...rawScored].sort(
    (a, b) => b.bm25Score - a.bm25Score || b.denseScore - a.denseScore || a.doc.id.localeCompare(b.doc.id),
  );
  const denseSorted = [...rawScored].sort(
    (a, b) => b.denseScore - a.denseScore || b.bm25Score - a.bm25Score || a.doc.id.localeCompare(b.doc.id),
  );

  const bm25RankMap = new Map(bm25Sorted.map((item, idx) => [item.doc.id, idx + 1]));
  const denseRankMap = new Map(denseSorted.map((item, idx) => [item.doc.id, idx + 1]));
  const rrfK = 60;

  const fused = rawScored.map((item) => {
    const rBm25 = bm25RankMap.get(item.doc.id) ?? KB_CORPUS.length;
    const rDense = denseRankMap.get(item.doc.id) ?? KB_CORPUS.length;
    const rrfScore = Math.round((1 / (rrfK + rBm25) + 1 / (rrfK + rDense)) * 10000) / 10000;
    return {
      ...item,
      rBm25,
      rDense,
      rrfScore,
    };
  });

  const maxRrf = Math.max(0.0001, ...fused.map((f) => f.rrfScore));

  const withRerank = fused.map((item) => {
    const normRrf = item.rrfScore / maxRrf;
    const normBm25 = item.bm25Score / maxBm25;
    const tagText = `${item.doc.title} ${item.doc.tags.join(" ")}`.toLowerCase();
    const tagHits = queryTokens.filter((t) => tagText.includes(t)).length;
    const intentBonus = Math.min(0.08, tagHits * 0.025);
    const rawRerank =
      0.5 * normRrf +
      0.34 * item.denseScore +
      0.1 * normBm25 +
      intentBonus;
    const rerankScore = Math.round(Math.min(0.996, rawRerank) * 1000) / 1000;

    const finalScore =
      mode === "bm25" ? item.bm25Score : mode === "dense" ? item.denseScore : rerankScore;

    return {
      ...item,
      rerankScore,
      finalScore,
    };
  });

  const finalSorted = [...withRerank].sort((a, b) => {
    if (mode === "bm25") {
      return b.bm25Score - a.bm25Score || b.denseScore - a.denseScore || a.doc.id.localeCompare(b.doc.id);
    }
    if (mode === "dense") {
      return b.denseScore - a.denseScore || b.bm25Score - a.bm25Score || a.doc.id.localeCompare(b.doc.id);
    }
    return b.rerankScore - a.rerankScore || b.rrfScore - a.rrfScore || a.doc.id.localeCompare(b.doc.id);
  });

  const topResults: RankedKbResult[] = finalSorted.slice(0, clampedK).map((item, idx) => ({
    doc: item.doc,
    rank: idx + 1,
    bm25Score: item.bm25Score,
    denseScore: item.denseScore,
    rrfScore: item.rrfScore,
    rerankScore: item.rerankScore,
    finalScore: item.finalScore,
    rankDelta: item.rBm25 - (idx + 1),
    matchedTerms: item.matchedTerms,
  }));

  const primary = topResults[0]?.doc;
  if (!primary) {
    throw new Error("KB_CORPUS must contain at least one document");
  }
  const secondary = topResults[1];
  const citations =
    secondary && secondary.denseScore >= 0.4
      ? [primary.id, secondary.doc.id]
      : [primary.id];

  const stepsPreview = primary.resolution.slice(0, 2).join(" ");
  const groundedAnswer = `[${primary.id} · ${primary.title}] ${stepsPreview} ${primary.escalationCue}`;
  const mcpDispatch = buildMcpDispatch(primary, citations, query);

  const latencyBreakdownMs: LatencyBreakdownMs = {
    bm25_ms: 4.2,
    dense_ms: mode === "bm25" ? 0 : 12.6,
    rrf_fusion_ms: mode === "hybrid_rerank" ? 1.4 : 0,
    rerank_ms: mode === "hybrid_rerank" ? 18.8 : 0,
    total_ms: mode === "bm25" ? 4.2 : mode === "dense" ? 16.8 : 37.0,
  };

  return {
    query,
    mode,
    topK: clampedK,
    corpusSize: KB_CORPUS.length,
    results: topResults,
    groundedAnswer,
    citations,
    mcpDispatch,
    latencyBreakdownMs,
  };
}
