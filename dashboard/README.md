## Recalibra Dashboard

The dashboard presents live drift metrics, alerting, and audit trails for regulated environments.

### Planned Stack

- Vite + React + TypeScript for rapid iteration.
- Tailwind CSS for UI primitives.
- `@tanstack/react-query` for API data fetching.
- Recharts for visualization.
- Websocket (or Server-Sent Events) channel for real-time updates.

### Initial Views

1. **Overview** – global KPIs (RMSE, R², drift status), active alerts, last ingestion time.
2. **Drift Explorer** – filters by assay, reagent batch, instrument, operator; interactive charts.
3. **Recalibration History** – timeline of model/correction deployments with audit metadata.
4. **Connectors** – integration health and sync status per external system.

### Getting Started

Run the following once the frontend is scaffolded:

```bash
pnpm install
pnpm dev
```

> Note: The dashboard scaffold will be added in a subsequent iteration.

