import { Link } from "react-router-dom";
import { ButtonLink } from "@magani/ui";
import { Brand } from "@/components/Shell";
import {
  ArrowRight, Check, Clock, HeartPulse, MessageSquare, Package, PackagePlus, ShieldCheck, ShoppingBag, Smartphone,
} from "@magani/ui/icons";
import supplies from "@/assets/pharmacy-supplies.png";
import "@magani/ui/landing.css";

const preview = [
  { name: "Metformin", strength: "500 mg · Tablets", packs: 24, days: 4, health: "low" },
  { name: "Amlodipine", strength: "5 mg · Tablets", packs: 0, days: 0, health: "out" },
  { name: "Paracetamol", strength: "500 mg · Tablets", packs: 186, days: 31, health: "good" },
] as const;

const features = [
  {
    icon: Package,
    title: "Stock that knows its expiry dates",
    body: "Every delivery is recorded by batch and expiry. Sales take from the batch that expires first, and expired stock is never sold.",
  },
  {
    icon: Clock,
    title: "Days of cover, at a glance",
    body: "Magani learns how fast each medicine sells and shows how many days it will last, so you restock before the shelf is empty.",
  },
  {
    icon: HeartPulse,
    title: "Refill reminders for chronic care",
    body: "Register hypertension and diabetes patients with their consent. Magani sends an SMS in Hausa or English before each refill is due.",
  },
  {
    icon: Smartphone,
    title: "Keeps working when the network drops",
    body: "The Android app records sales and deliveries offline and syncs them when the connection returns, without counting anything twice.",
  },
];

const steps = [
  { title: "Create your pharmacy account", body: "Enter your pharmacy name, state, LGA and the owner's phone number. It takes a few minutes." },
  { title: "Add your medicines", body: "Add what you stock, then record deliveries with batch number, quantity and expiry date." },
  { title: "Sell, remind and restock", body: "Record sales at the counter. Today's list shows what is running low, expiring or due for refill." },
];

const faqs = [
  {
    q: "Can other pharmacies see my records?",
    a: "No. Each pharmacy has its own account, and every medicine, sale and patient record belongs only to your pharmacy.",
  },
  {
    q: "Can I change my pharmacy name or location later?",
    a: "Yes. The owner can update the pharmacy name, outlet type, state and LGA at any time from Pharmacy settings.",
  },
  {
    q: "Do I need internet all the time?",
    a: "The web app needs a connection. The Android app keeps recording sales and deliveries offline and syncs when the network is back.",
  },
  {
    q: "How are patient details protected?",
    a: "A patient is only registered after they consent to storing their details and receiving reminders, in line with the Nigeria Data Protection Act 2023. Magani stores only what reminders need.",
  },
  {
    q: "Is it for patent medicine vendors too?",
    a: "Yes. Choose Pharmacy or Patent medicine vendor when you create your account.",
  },
];

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" aria-label="Magani home">
          <Brand />
        </Link>
        <nav aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#faq">Questions</a>
        </nav>
        <div className="landing-nav-actions">
          <ButtonLink to="/login" variant="ghost">
            Sign in
          </ButtonLink>
          <ButtonLink to="/signup">Get started</ButtonLink>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div>
            <div className="eyebrow">For community pharmacies and patent medicine vendors</div>
            <h1>Every pack counted. Every patient back on time.</h1>
            <p>
              Magani is stock control and refill reminders built for a busy counter. Know what you have, what is expiring and who needs
              their next refill, all under your own pharmacy's name.
            </p>
            <div className="landing-cta">
              <ButtonLink to="/signup" className="landing-big">
                Create your pharmacy account
                <ArrowRight />
              </ButtonLink>
              <ButtonLink to="/login" variant="outline" className="landing-big">
                Sign in
              </ButtonLink>
            </div>
            <ul className="landing-points">
              <li>
                <Check size={16} /> Works on cheap Android phones
              </li>
              <li>
                <Check size={16} /> SMS reminders in Hausa and English
              </li>
              <li>
                <Check size={16} /> Your records stay private to your pharmacy
              </li>
            </ul>
          </div>

          <div className="landing-preview" aria-label="Example of the Magani stock view">
            <div className="landing-preview-head">
              <strong>Stock at a glance</strong>
              <span className="muted text-xs">Example pharmacy</span>
            </div>
            {preview.map((p) => (
              <div className="landing-preview-row" key={p.name}>
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.strength}</small>
                </div>
                <div className="cover-cell">
                  <div className={`blister ${p.health}`}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <i key={i} className={`capsule ${i < Math.ceil(p.days / 3) ? "filled" : ""}`} />
                    ))}
                  </div>
                  <span>{p.days} days</span>
                </div>
                <span className={`pill ${p.health}`}>{p.health === "out" ? "Out of stock" : p.health === "low" ? "Running low" : "Healthy"}</span>
              </div>
            ))}
            <div className="landing-preview-refill">
              <span className="avatar">AI</span>
              <div>
                <strong>Aisha Ibrahim</strong>
                <small>Metformin refill due today · Hausa SMS</small>
              </div>
              <MessageSquare size={18} className="text-primary" />
            </div>
            <img src={supplies} alt="" width={140} height={140} />
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-section-head">
            <div className="eyebrow">What Magani does</div>
            <h2>Less guesswork on the shelf. Fewer missed refills.</h2>
          </div>
          <div className="landing-features">
            {features.map((f) => (
              <article key={f.title}>
                <span className="stat-icon">
                  <f.icon />
                </span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="landing-section">
          <div className="landing-section-head">
            <div className="eyebrow">How it works</div>
            <h2>Ready for your counter today</h2>
          </div>
          <ol className="landing-steps">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="landing-step-number">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section landing-yours">
          <div>
            <ShieldCheck size={28} className="text-primary" />
            <h2>Your pharmacy, your name</h2>
            <p>
              Every pharmacy that signs up gets its own private workspace with its own name, location, medicines, sales and patients. The
              owner can update the pharmacy's details whenever they change.
            </p>
          </div>
          <ul>
            <li>
              <ShoppingBag size={18} /> Sales and stock for your shop only
            </li>
            <li>
              <PackagePlus size={18} /> Your own medicine list and prices
            </li>
            <li>
              <HeartPulse size={18} /> Your patients, with their recorded consent
            </li>
          </ul>
        </section>

        <section id="faq" className="landing-section">
          <div className="landing-section-head">
            <div className="eyebrow">Questions</div>
            <h2>What pharmacies ask us</h2>
          </div>
          <div className="landing-faq">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final">
          <h2>Bring your pharmacy onto Magani</h2>
          <p>Create your account, add your medicines and record your first sale today.</p>
          <ButtonLink to="/signup" className="landing-big">
            Get started
            <ArrowRight />
          </ButtonLink>
        </section>
      </main>

      <footer className="landing-footer">
        <Brand />
        <span>Care in every count · © {new Date().getFullYear()} Magani</span>
        <nav aria-label="Account">
          <Link to="/login">Sign in</Link>
          <Link to="/signup">Create account</Link>
        </nav>
      </footer>
    </div>
  );
}
