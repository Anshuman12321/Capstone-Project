const capSummary = {
  leagueCap: 150_000_000,
  activePayroll: 132_800_000,
  deadCap: 6_500_000,
}

const contracts = [
  { player: 'Jalen Brooks', role: 'PG', yearsLeft: 3, annualCapHit: 28_400_000 },
  { player: 'Malik Stone', role: 'SG', yearsLeft: 2, annualCapHit: 24_750_000 },
  { player: 'Terrence Ward', role: 'SF', yearsLeft: 1, annualCapHit: 18_100_000 },
  { player: 'Anton Hayes', role: 'PF', yearsLeft: 4, annualCapHit: 15_600_000 },
  { player: 'Calvin Reed', role: 'C', yearsLeft: 1, annualCapHit: 12_200_000 },
]

const upcomingObligations = [
  { title: 'Rookie Extension Window', detail: 'Jalen Brooks eligible after Week 10', amount: 31_000_000 },
  { title: 'Expiring Contract', detail: 'Terrence Ward becomes UFA this offseason', amount: 18_100_000 },
  { title: 'Dead Cap Relief', detail: 'Legacy buyout drops after this season', amount: -4_000_000 },
]

function toCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CapSpacePage() {
  const committed = capSummary.activePayroll + capSummary.deadCap
  const capRemaining = capSummary.leagueCap - committed

  return (
    <div className="cap-space-page">
      <section className="cap-space-hero">
        <div>
          <h1>Cap Space</h1>
          <p>Track payroll health, manage contracts, and forecast offseason flexibility.</p>
        </div>
      </section>

      <section className="cap-summary-grid">
        <article className="cap-summary-card">
          <p>League Cap</p>
          <strong>{toCurrency(capSummary.leagueCap)}</strong>
        </article>
        <article className="cap-summary-card">
          <p>Committed Payroll</p>
          <strong>{toCurrency(committed)}</strong>
        </article>
        <article className="cap-summary-card">
          <p>Cap Remaining</p>
          <strong className={capRemaining >= 0 ? 'positive' : 'negative'}>{toCurrency(capRemaining)}</strong>
        </article>
      </section>

      <div className="cap-space-grid">
        <section className="cap-contracts-card">
          <div className="section-head">
            <h2>Contracts</h2>
            <span>Current Roster Commitments</span>
          </div>
          <div className="cap-contract-list">
            {contracts.map((contract) => (
              <article key={contract.player} className="cap-contract-row">
                <div>
                  <p>{contract.player}</p>
                  <small>{contract.role}</small>
                </div>
                <div>
                  <small>Years Left</small>
                  <p>{contract.yearsLeft}</p>
                </div>
                <div>
                  <small>Annual Cap Hit</small>
                  <p>{toCurrency(contract.annualCapHit)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="cap-obligations-card">
          <h2>Upcoming Obligations</h2>
          <div className="cap-obligation-list">
            {upcomingObligations.map((item) => (
              <article key={item.title}>
                <p>{item.title}</p>
                <small>{item.detail}</small>
                <strong className={item.amount < 0 ? 'positive' : ''}>{toCurrency(item.amount)}</strong>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
