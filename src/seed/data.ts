import type { Channel, PlacementType, Pillar, TaskCategory, TaskPriority } from "@/lib/constants";

type SeedTask = [title: string, category: TaskCategory, due: string, priority: TaskPriority];

export const SEED_TASKS: SeedTask[] = [
  ["Change shared account passwords, turn on 2FA, move credentials to a password manager", "admin", "2026-10-07", "high"],
  ["Email local editors for January copy deadlines and formats (Meppershall Messenger, Clifton Chronicle, Biggleswade Chronicle, BigglesFM, The Villager, The Comet)", "press", "2026-10-14", "high"],
  ["Get print quotes: A3 (laminated), A4, A6 and the 2m x 1m banner. Check against budget", "print", "2026-10-21", "high"],
  ["Decide which mailing list platform is live (Mailchimp or MailerLite) and clean the list", "email", "2026-10-19", "normal"],
  ["Draft poster and leaflet artwork (A3, A4, A6, social 1080x1350 and square, TicketSource banner 1600x200)", "content", "2026-10-19", "high"],
  ["Create tracked QR links for every print placement, before artwork is finalised", "print", "2026-10-23", "high"],
  ["Finalise poster artwork, including licence credits and the QR code", "content", "2026-10-26", "high"],
  ["Collect photo and video consent forms (parent or guardian for under-18s)", "admin", "2026-10-26", "high"],
  ["Get committee approval of final artwork", "admin", "2026-10-28", "normal"],
  ["Cast reveal photo session (props and backdrops, one session)", "content", "2026-10-28", "normal"],
  ["Schedule November posts in Meta Business Suite", "social", "2026-11-01", "normal"],
  ["Order print: A3 (laminated), A4, A6", "print", "2026-11-02", "high"],
  ["Confirm ticket prices, performances and pre-sale code in TicketSource; upload the 1600x200 banner", "ticketing", "2026-11-02", "high"],
  ["Start the cast reveal series (one a day, Dorothy last)", "social", "2026-11-02", "normal"],
  ["Send the pre-sale email to the mailing list", "email", "2026-11-09", "high"],
  ["Collect printed materials and refresh the village hall noticeboard", "print", "2026-11-09", "normal"],
  ["Send press release and submit What's On listings (BigglesFM, The Villager, The Comet). Check each deadline", "press", "2026-11-09", "high"],
  ["Send the Biggleswade Chronicle article with cast photos", "press", "2026-11-09", "normal"],
  ["General sale launch: posts on all channels, email, local Facebook groups and NextDoor", "social", "2026-11-16", "high"],
  ["Distribute posters and leaflets (Messenger, Clifton Chronicle, shops, schools, libraries)", "print", "2026-11-16", "high"],
  ["Design the 2m x 1m banner and place the print order", "print", "2026-11-30", "normal"],
  ["Sales checkpoint: 25% sold", "ticketing", "2026-12-01", "normal"],
  ["Schedule December posts in Meta Business Suite", "social", "2026-12-05", "normal"],
  ["Start Facebook and Instagram paid boosts", "social", "2026-12-07", "normal"],
  ["Programme: collect cast list, bios and adverts; first draft", "print", "2026-12-15", "normal"],
  ["Hang the banner at Walnut Tree Way", "print", "2026-12-18", "normal"],
  ["Proofread programme and send to printer; order cast posters", "print", "2026-12-23", "high"],
  ["Sales checkpoint: 50% sold", "ticketing", "2026-12-24", "normal"],
  ['Send the "3 weeks to go" email', "email", "2027-01-01", "normal"],
  ["Schedule January posts in Meta Business Suite", "social", "2027-01-02", "normal"],
  ["Programmes and cast posters printed and delivered", "print", "2027-01-15", "high"],
  ["Sales checkpoint: 70% sold. Chase the slowest performances and use the budget reserve", "ticketing", "2027-01-15", "high"],
  ["Send the show-week email with practical info (parking, doors open, accessibility)", "email", "2027-01-18", "high"],
  ["Post thank-you and photo gallery", "social", "2027-02-01", "normal"],
  ["Send the audience feedback form to the mailing list", "email", "2027-02-02", "normal"],
  ["Record final sales per performance and note what to do differently next time", "admin", "2027-02-06", "normal"],
];

const FB_IG: Channel[] = ["facebook", "instagram"];
const ALL: Channel[] = ["facebook", "instagram", "tiktok", "nextdoor", "email"];

type SeedPost = [date: string, channels: Channel[], title: string, pillar: Pillar];

export const SEED_POSTS: SeedPost[] = [
  ["2026-10-05", ["facebook", "instagram", "nextdoor", "email"], "Announcement: The Wizard of Oz", "practical"],
  ["2026-10-08", FB_IG, "Readthrough photo", "behind_the_scenes"],
  ["2026-10-12", ALL, "Audition call", "practical"],
  ["2026-10-15", FB_IG, "Audition night", "behind_the_scenes"],
  ["2026-10-19", FB_IG, "Last chance to audition", "practical"],
  ["2026-10-23", FB_IG, "Thank you to everyone who auditioned", "social_proof"],
  ["2026-10-26", FB_IG, "Casting teaser", "cast"],
  ["2026-10-28", ["facebook", "instagram", "tiktok"], "First rehearsal", "behind_the_scenes"],
  ["2026-11-02", FB_IG, "Cast reveal series begins", "cast"],
  ["2026-11-04", ["facebook", "instagram", "nextdoor"], "Posters on their way", "practical"],
  ["2026-11-09", ["facebook", "instagram", "email"], "Pre-sale opens", "practical"],
  ["2026-11-12", ["tiktok", "instagram", "facebook"], "First rehearsal clip", "oz_fun"],
  ["2026-11-16", ALL, "General sale opens", "practical"],
];

/** Posts only have a date in the plan; give them a placeholder time to edit later. */
export const SEED_POST_TIME = "09:00";

type SeedLink = [slug: string, label: string, placement: PlacementType];

export const SEED_QR_LINKS: SeedLink[] = [
  ["a3-village-hall", "A3 poster, village hall noticeboard", "poster_a3"],
  ["a3-shops", "A3 poster, shops and community boards", "poster_a3"],
  ["a4-schools", "A4 poster, schools and libraries", "poster_a4"],
  ["leaflet-a6", "A6 leaflet", "leaflet_a6"],
  ["banner-walnut-tree-way", "2m x 1m banner, Walnut Tree Way", "banner"],
  ["programme", "Programme", "programme"],
  ["press-meppershall-messenger", "Meppershall Messenger", "press"],
  ["press-clifton-chronicle", "Clifton Chronicle", "press"],
  ["press-biggleswade-chronicle", "Biggleswade Chronicle", "press"],
];
