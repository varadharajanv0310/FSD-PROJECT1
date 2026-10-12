import type { BankPoint, BankQuestion } from "./types";

const REQUIREMENTS: BankPoint = {
  point: "Clarifies functional and non-functional requirements and scale",
  terms: ["requirement", "clarify", "assume", "scale", "users", "qps", "requests per second", "read-heavy", "write-heavy", "latency"],
};
const TRADEOFFS: BankPoint = {
  point: "Discusses trade-offs, bottlenecks and failure handling",
  terms: ["trade-off", "tradeoff", "bottleneck", "failure", "single point", "replica", "fault", "availability", "consistency"],
};

export const SYSTEM_DESIGN_QUESTIONS: BankQuestion[] = [
  {
    id: "sd-url-shortener",
    roles: ["software-engineer", "backend", "fullstack", "devops"],
    type: "system-design",
    category: "System design",
    difficulty: "medium",
    text: "Design a URL shortener like bit.ly.",
    hint: "Requirements and scale first, then the API, short-code generation, storage, redirects and caching.",
    points: [
      REQUIREMENTS,
      { point: "Defines the API (create short URL, redirect)", terms: ["api", "post", "get", "redirect", "301", "302", "endpoint"] },
      { point: "Short-code generation (base62, counter, hashing) and collisions", terms: ["base62", "base 62", "hash", "counter", "unique id", "collision", "snowflake", "random"] },
      { point: "Storage choice and caching hot links", terms: ["database", "key-value", "nosql", "cache", "redis", "cdn"] },
      TRADEOFFS,
    ],
    answer:
      "I'd confirm requirements: create a short link for a long URL, redirect quickly, optional custom aliases and expiry, with maybe 100 million new links a month and a read-heavy ratio around 100 to 1. The API is POST /links returning a short code, and GET /{code} returning a 302 redirect — or 301 if we don't need click analytics. For codes, I'd take a unique ID from a distributed counter or Snowflake-style generator and encode it in base62; seven characters give over three trillion combinations with no collisions to check. A key-value store like DynamoDB or Cassandra maps code to URL and scales horizontally. Because redirects dominate, I'd cache popular codes in Redis and at the CDN edge. Click analytics go onto a queue asynchronously so they never slow the redirect. Replication avoids a single point of failure.",
  },
  {
    id: "sd-chat",
    roles: ["software-engineer", "backend", "fullstack", "mobile"],
    type: "system-design",
    category: "System design",
    difficulty: "hard",
    text: "Design a real-time chat application like WhatsApp.",
    hint: "Cover connections (WebSockets), message flow and storage, delivery/read receipts, offline users and group chats.",
    points: [
      REQUIREMENTS,
      { point: "Persistent connections via WebSockets with a gateway layer", terms: ["websocket", "persistent connection", "long poll", "gateway", "socket", "connection server"] },
      { point: "Message flow, storage and ordering", terms: ["message id", "store", "cassandra", "database", "ordering", "sequence", "timestamp", "partition"] },
      { point: "Offline delivery via push notifications and sync", terms: ["offline", "push notification", "queue", "sync", "undelivered", "inbox"] },
      { point: "Delivery/read receipts, presence and group fan-out", terms: ["receipt", "delivered", "read", "presence", "online", "group", "fan-out", "fanout"] },
    ],
    answer:
      "Core requirements: one-to-one and group messaging, delivery and read receipts, online presence, and offline delivery, for hundreds of millions of users with low latency. Clients keep a persistent WebSocket to a fleet of connection gateways; a session service in Redis maps each user to their gateway. When Alice sends a message, it's assigned a unique, time-ordered ID, persisted in a store partitioned by conversation — Cassandra suits this write-heavy pattern — and then routed to Bob's gateway. If Bob is offline, it stays in his undelivered inbox and we send a push notification; when he reconnects, the client syncs everything after its last received ID. Receipts are just small messages flowing back. For groups, the server fans out to each member, with large groups handled asynchronously through a queue. End-to-end encryption means the server only stores ciphertext.",
  },
  {
    id: "sd-rate-limiter",
    roles: ["software-engineer", "backend", "devops"],
    type: "system-design",
    category: "System design",
    difficulty: "medium",
    text: "Design a distributed rate limiter for an API gateway.",
    hint: "Choose an algorithm, decide where it runs, and handle shared state, accuracy and failure modes.",
    points: [
      REQUIREMENTS,
      { point: "Algorithm choice (token bucket, sliding window) and its trade-offs", terms: ["token bucket", "leaky bucket", "sliding window", "fixed window", "burst"] },
      { point: "Shared state in a fast store with atomic updates", terms: ["redis", "atomic", "lua", "incr", "shared", "central"] },
      { point: "Placement (gateway/middleware) and rule configuration", terms: ["gateway", "middleware", "rules", "per user", "api key", "tier", "config"] },
      { point: "Failure handling and client communication (fail open, 429)", terms: ["fail open", "fail-open", "fail closed", "429", "retry-after", "latency", "local cache"] },
    ],
    answer:
      "Requirements: limit requests per API key and endpoint — for example 1,000 a minute on the free tier — accurately across many gateway servers, adding under a few milliseconds of latency. I'd use a token bucket, which allows short bursts while enforcing an average rate, or a sliding window counter if smooth enforcement matters more. The limiter runs as middleware in the API gateway so requests are rejected before reaching services. State lives in Redis, sharded by key, and each check-and-decrement is an atomic Lua script so concurrent requests can't both take the last token. Rules come from a config service and are cached locally. On rejection we return 429 with Retry-After and rate-limit headers. If Redis is unavailable I'd fail open with a conservative local in-memory limit, so the limiter never becomes the outage.",
  },
  {
    id: "sd-news-feed",
    roles: ["software-engineer", "backend", "fullstack"],
    type: "system-design",
    category: "System design",
    difficulty: "hard",
    text: "Design the news feed for a social network like Instagram.",
    hint: "Fan-out on write vs fan-out on read, handling celebrities, ranking, caching and pagination.",
    points: [
      REQUIREMENTS,
      { point: "Fan-out on write (push) vs on read (pull)", terms: ["fan-out", "fanout", "push model", "pull model", "on write", "on read", "precompute"] },
      { point: "Hybrid approach for celebrities / high-follower accounts", terms: ["celebrit", "hybrid", "million followers", "high follower", "hot user"] },
      { point: "Feed storage/caching and cursor pagination", terms: ["cache", "redis", "timeline", "cursor", "paginat", "feed store"] },
      { point: "Ranking and media delivery (CDN)", terms: ["rank", "relevance", "machine learning", "score", "cdn", "media", "chronolog"] },
    ],
    answer:
      "Requirements: users see recent posts from accounts they follow, ranked, loading in under 200 ms, with feed reads far outnumbering posts. The key decision is fan-out. With fan-out on write, when someone posts, a worker inserts the post ID into each follower's precomputed timeline in a cache like Redis, so reading a feed is a single cheap lookup. That breaks for celebrities with tens of millions of followers, so I'd use a hybrid: normal accounts fan out on write, while celebrity posts are pulled at read time and merged in. The feed service then ranks candidates using signals like recency, relationship strength and engagement predictions, and returns pages with a cursor. Post metadata lives in a sharded database, and images and videos are served from object storage through a CDN.",
  },
  {
    id: "sd-file-storage",
    roles: ["software-engineer", "backend", "devops"],
    type: "system-design",
    category: "System design",
    difficulty: "hard",
    text: "Design a file storage and sync service like Google Drive or Dropbox.",
    hint: "Separate metadata from file content, chunk files, sync changes efficiently and handle conflicts.",
    points: [
      REQUIREMENTS,
      { point: "Separates metadata service/DB from blob storage", terms: ["metadata", "blob", "object storage", "s3", "separate"] },
      { point: "Chunking and deduplication for efficient uploads", terms: ["chunk", "block", "dedup", "hash", "delta", "resumable"] },
      { point: "Sync via change notifications and versioning", terms: ["sync", "notification", "long poll", "websocket", "version", "change log", "journal"] },
      { point: "Conflict handling and sharing permissions", terms: ["conflict", "conflicted copy", "permission", "share", "acl"] },
    ],
    answer:
      "Requirements: upload, download and share files up to several gigabytes, sync across a user's devices, keep version history, and never lose data. I'd separate metadata from content. Files are split into chunks of about 4 MB, each identified by its content hash and stored in object storage like S3; identical chunks are stored once, which deduplicates data and makes uploads resumable — an edit only re-uploads changed chunks. A metadata service with a relational database tracks folders, files, versions as ordered lists of chunk hashes, and sharing permissions. Every change is appended to a per-user change journal; devices hold a long-poll or WebSocket connection to learn about changes and pull only what's new. If two devices edit the same version offline, we keep both and create a 'conflicted copy' rather than silently overwriting.",
  },
  {
    id: "sd-notifications",
    roles: ["software-engineer", "backend", "mobile", "devops"],
    type: "system-design",
    category: "System design",
    difficulty: "medium",
    text: "Design a notification system that sends email, SMS and push notifications.",
    hint: "Producers, a queue per channel, user preferences, templates, retries, rate limits and tracking.",
    points: [
      REQUIREMENTS,
      { point: "Decouples producers from senders with queues per channel", terms: ["queue", "kafka", "sqs", "rabbit", "decoupl", "worker", "per channel"] },
      { point: "User preferences, templates and deduplication", terms: ["preference", "opt out", "opt-out", "template", "dedup", "idempoten", "quiet hours"] },
      { point: "Retries, provider failover and rate limiting", terms: ["retry", "backoff", "failover", "provider", "rate limit", "dead letter", "dlq"] },
      { point: "Tracking delivery status and analytics", terms: ["status", "track", "delivered", "open", "click", "analytics", "log"] },
    ],
    answer:
      "Requirements: any internal service can trigger notifications across email, SMS and push, respecting user preferences, at peaks of maybe a million notifications a minute, with reliable delivery. Producers call a notification API with an event type, user and data; the service validates it, checks the user's channel preferences and quiet hours, renders the right template, deduplicates using an idempotency key, then publishes to a queue per channel. Channel workers call third-party providers — SES for email, an SMS gateway, APNs and FCM for push — with retries and exponential backoff, failover to a secondary provider, and per-provider rate limits; messages that keep failing go to a dead-letter queue. Every notification's status is recorded, so we can show history and measure delivery, opens and clicks. Separate queues keep a flood of marketing emails from delaying critical OTP SMS.",
  },
  {
    id: "sd-online-judge",
    roles: ["software-engineer", "backend", "devops"],
    type: "system-design",
    category: "System design",
    difficulty: "hard",
    text: "Design an online coding judge like LeetCode that runs user-submitted code.",
    hint: "The hard parts are secure sandboxed execution and handling spikes during contests.",
    points: [
      REQUIREMENTS,
      { point: "Submissions go to a queue processed by judge workers", terms: ["queue", "worker", "async", "asynchronous", "job", "poll", "websocket"] },
      { point: "Secure sandboxing (containers, resource limits, no network)", terms: ["sandbox", "container", "docker", "isolat", "gvisor", "firecracker", "cpu limit", "memory limit", "no network", "seccomp"] },
      { point: "Runs against test cases with time/memory limits and verdicts", terms: ["test case", "verdict", "time limit", "tle", "wrong answer", "memory limit", "compare output"] },
      { point: "Scales workers for contest spikes; leaderboards", terms: ["autoscal", "scale", "contest", "spike", "leaderboard", "redis", "sorted set"] },
    ],
    answer:
      "Requirements: users submit code in several languages, get a verdict within seconds, and contests bring huge spikes — say 50,000 submissions in the first minutes. The web API stores the submission and puts a job on a queue, returning immediately; the client gets the verdict by polling or WebSocket. Judge workers pull jobs and run code inside a hardened sandbox: a fresh container or micro-VM like Firecracker with no network access, a read-only file system, seccomp syscall filtering, and strict CPU, memory, process and time limits, because we're running untrusted code. The worker compiles, runs each hidden test case, compares output, and records the verdict — accepted, wrong answer, time limit exceeded and so on. Workers autoscale on queue depth, with pre-warmed sandboxes before contests, and the live leaderboard uses a Redis sorted set.",
  },
  {
    id: "sd-typeahead",
    roles: ["frontend", "fullstack", "software-engineer"],
    type: "system-design",
    category: "Frontend system design",
    difficulty: "medium",
    text: "Design a search autocomplete (typeahead) component, front end and back end.",
    hint: "Client: debouncing, caching, race conditions, keyboard and accessibility. Server: prefix lookup and ranking.",
    points: [
      { point: "Debounces input and cancels stale requests (race conditions)", terms: ["debounce", "throttle", "abort", "cancel", "race", "stale", "latest"] },
      { point: "Client-side caching of results", terms: ["cache", "memo", "previous queries", "lru"] },
      { point: "Keyboard navigation and accessibility (combobox ARIA)", terms: ["keyboard", "arrow", "aria", "combobox", "screen reader", "accessib"] },
      { point: "Backend prefix index (trie) with ranking by popularity", terms: ["trie", "prefix", "rank", "popular", "frequency", "elasticsearch", "top k", "top-k"] },
    ],
    answer:
      "On the client, I'd debounce keystrokes by about 150 to 300 milliseconds so we don't send a request for every letter, and cancel in-flight requests with an AbortController — or ignore out-of-order responses — so an older, slower response can't overwrite newer results. Results are cached per query in a small LRU cache, which makes backspacing instant. The component follows the ARIA combobox pattern: arrow keys move through suggestions, Enter selects, Escape closes, and the active option is announced to screen readers, with the matching prefix highlighted. On the server, suggestions come from a prefix index — a trie whose nodes store the top-k completions precomputed by popularity, or a search engine like Elasticsearch — and responses are small and cacheable at the CDN for common prefixes. I'd log selections to improve ranking over time.",
  },
  {
    id: "sd-ride-sharing",
    roles: ["software-engineer", "backend", "mobile"],
    type: "system-design",
    category: "System design",
    difficulty: "hard",
    text: "Design the backend for a ride-hailing app like Uber or Ola.",
    hint: "Location updates at scale, geospatial indexing for nearby drivers, matching, and trip state.",
    points: [
      REQUIREMENTS,
      { point: "Ingests frequent driver location updates efficiently", terms: ["location update", "every few seconds", "gps", "websocket", "stream", "kafka", "in-memory"] },
      { point: "Geospatial index for nearby drivers (geohash, quadtree, H3)", terms: ["geohash", "quadtree", "h3", "geospatial", "nearby", "radius", "redis geo", "s2"] },
      { point: "Matching/dispatch logic and trip state machine", terms: ["match", "dispatch", "assign", "state machine", "trip state", "accept", "timeout"] },
      { point: "Pricing/surge, payments and reliability considerations", terms: ["surge", "pricing", "payment", "eta", "consisten", "failover", "lock"] },
    ],
    answer:
      "Requirements: riders request a ride, nearby drivers get matched within seconds, both see live locations, and the system handles millions of drivers each sending GPS updates every four seconds. Driver apps stream locations over a persistent connection to location services, which keep only the latest position in memory, indexed geospatially — by geohash or H3 cells — so 'find available drivers within 2 km' is a lookup of a few neighbouring cells; full location history goes to Kafka for analytics. When a rider requests a trip, the dispatch service finds candidate drivers, ranks them by ETA, and offers the ride to one at a time with a short timeout, using a lock so a driver can't be double-assigned. Each trip moves through an explicit state machine — requested, accepted, arriving, in progress, completed — persisted in a durable database. Pricing computes fares and surge per area based on supply and demand, and payments are charged asynchronously at the end.",
  },
  {
    id: "sd-mobile-offline-sync",
    roles: ["mobile"],
    type: "system-design",
    category: "Mobile system design",
    difficulty: "hard",
    text: "Design a mobile to-do app that works fully offline and syncs across a user's devices.",
    hint: "Local-first data model, change tracking, sync protocol, conflict resolution and battery/network constraints.",
    points: [
      { point: "Local database as source of truth with a local-first UI", terms: ["local database", "sqlite", "room", "core data", "local-first", "source of truth"] },
      { point: "Tracks changes (outbox/change log) with unique IDs", terms: ["outbox", "change log", "pending", "uuid", "client id", "queue"] },
      { point: "Sync protocol: push local changes, pull since a cursor/token", terms: ["sync token", "cursor", "since", "delta", "pull", "push", "incremental"] },
      { point: "Conflict resolution strategy", terms: ["conflict", "last write wins", "last-write-wins", "version", "merge", "crdt", "field-level"] },
      { point: "Respects battery and network (background scheduling, batching)", terms: ["battery", "background", "workmanager", "batch", "wifi", "backoff"] },
    ],
    answer:
      "The app is local-first: every to-do lives in an on-device SQLite database, and the UI only reads from it, so it behaves identically offline. Items get client-generated UUIDs, so they can be created offline without the server assigning IDs. Each local change is also written to an outbox. Sync is incremental: the client pushes outbox operations in batches, then asks the server for all changes since its last sync token and applies them locally. The server keeps a per-user change log ordered by a monotonically increasing version. For conflicts — the same task edited on two offline devices — I'd merge at field level, using last-write-wins per field with server timestamps, so changing the title on one phone and ticking it done on another both survive. Deletions are tombstones. Sync runs on app open, after edits with a short delay, and periodically via background scheduling, with batching and backoff to save battery.",
  },
];
